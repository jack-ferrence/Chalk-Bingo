import { createClient } from '@supabase/supabase-js'

const ESPN_SCOREBOARD_NBA = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard'
const ESPN_SCOREBOARD_NCAA = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100&limit=100'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// In-memory cache: reused across warm invocations to avoid hammering ESPN
let scheduleCache = { data: null, ts: 0 }

/**
 * Netlify scheduled function (runs every 5 minutes via cron).
 *
 * For each NBA and NCAA tournament game that is scheduled or in-progress today:
 *   1. Check if a public room already exists for that game_id + sport
 *   2. If not, create one (status='lobby', room_type='public')
 *
 * Uses service role key to bypass RLS (system-created rows have created_by=NULL).
 *
 * Env vars:
 *   SUPABASE_URL              — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS)
 */
export async function handler() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const missing = []
  if (!url) missing.push('SUPABASE_URL')
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (missing.length > 0) {
    const msg = `sync-games: Missing env var(s): ${missing.join(', ')}`
    console.error(msg)
    return { statusCode: 500, body: JSON.stringify({ error: msg }) }
  }

  const supabase = createClient(url, serviceKey)
  const log = []

  // ── Step 1: Fetch today's schedule (cached 5 min) ──
  let games
  const now = Date.now()
  if (scheduleCache.data && now - scheduleCache.ts < CACHE_TTL) {
    games = scheduleCache.data
    log.push('schedule: served from cache')
  } else {
    try {
      const [nbaRes, ncaaRes] = await Promise.all([
        fetch(ESPN_SCOREBOARD_NBA),
        fetch(ESPN_SCOREBOARD_NCAA),
      ])

      if (!nbaRes.ok) throw new Error(`ESPN NBA returned ${nbaRes.status}`)
      if (!ncaaRes.ok) throw new Error(`ESPN NCAA returned ${ncaaRes.status}`)

      const [nbaRaw, ncaaRaw] = await Promise.all([nbaRes.json(), ncaaRes.json()])

      const nbaGames = parseGames(nbaRaw.events ?? [], 'nba')
      const ncaaGames = parseGames(ncaaRaw.events ?? [], 'ncaa').filter(isTournamentGame)

      games = [...nbaGames, ...ncaaGames]
      scheduleCache = { data: games, ts: now }
      log.push(`schedule: fetched ${nbaGames.length} NBA + ${ncaaGames.length} NCAA tournament game(s)`)
    } catch (err) {
      console.error('sync-games: ESPN fetch failed', err)
      return { statusCode: 502, body: JSON.stringify({ error: err.message }) }
    }
  }

  // ── Step 2: Filter to actionable games ──
  const actionable = games.filter(
    (g) => g.status === 'STATUS_SCHEDULED' || g.status === 'STATUS_IN_PROGRESS'
  )
  log.push(`actionable games: ${actionable.length}`)

  if (actionable.length === 0) {
    console.log('sync-games:', log.join(' | '))
    return {
      statusCode: 200,
      body: JSON.stringify({ created: 0, log }),
      headers: { 'Content-Type': 'application/json' },
    }
  }

  // ── Step 3: For each game, ensure a public room exists ──
  const gameIds = actionable.map((g) => g.id)

  // Fetch all existing public rooms for today's games in one query
  const { data: existingRooms, error: fetchErr } = await supabase
    .from('rooms')
    .select('game_id, sport')
    .eq('room_type', 'public')
    .neq('status', 'finished')
    .in('game_id', gameIds)

  if (fetchErr) {
    console.error('sync-games: existing rooms query failed', fetchErr)
    return { statusCode: 500, body: JSON.stringify({ error: fetchErr.message }) }
  }

  // Key by "gameId:sport" to handle same game_id across sports (shouldn't happen, but safe)
  const existingKeys = new Set((existingRooms ?? []).map((r) => `${r.game_id}:${r.sport}`))

  let created = 0
  for (const game of actionable) {
    const key = `${game.id}:${game.sport}`
    if (existingKeys.has(key)) continue

    const { error: insertErr } = await supabase.from('rooms').insert({
      name: game.roomName,
      game_id: game.id,
      sport: game.sport,
      room_type: 'public',
      status: 'lobby',
      starts_at: game.startsAt,
      created_by: null,
    })

    if (insertErr) {
      // Unique constraint violation = another invocation beat us to it — not an error
      if (insertErr.code === '23505') {
        log.push(`${game.id} (${game.sport}): already created (race)`)
        continue
      }
      console.error(`sync-games: insert failed for game ${game.id}`, insertErr)
      log.push(`${game.id} (${game.sport}): INSERT FAILED — ${insertErr.message}`)
      continue
    }

    created++
    log.push(`created room for ${game.id} (${game.roomName}) [${game.sport}]`)
    console.log(`sync-games: created public room for game ${game.id} — ${game.roomName} [${game.sport}]`)
  }

  log.push(`total created: ${created}`)
  console.log('sync-games:', log.join(' | '))

  return {
    statusCode: 200,
    body: JSON.stringify({ created, log }),
    headers: { 'Content-Type': 'application/json' },
  }
}

// ---------------------------------------------------------------------------
// ESPN parsing helpers
// ---------------------------------------------------------------------------

function parseGames(events, sport) {
  return events.map((event) => {
    const competition = event.competitions?.[0]
    const competitors = competition?.competitors ?? []

    const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[1]
    const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[0]

    const homeAbbr = home?.team?.abbreviation ?? 'HOM'
    const awayAbbr = away?.team?.abbreviation ?? 'AWY'

    return {
      id: String(event.id),
      sport,
      status: event.status?.type?.name ?? '',
      roomName: `${awayAbbr} vs ${homeAbbr}`,
      startsAt: event.date ?? null,
      _event: event,
    }
  })
}

/**
 * Best-effort NCAA tournament filter.
 * The groups=100 ESPN endpoint already scopes to the tournament bracket,
 * so most events from that feed are tournament games. We additionally check
 * the competition notes as a belt-and-suspenders filter.
 */
function isTournamentGame(game) {
  const event = game._event
  const competition = event.competitions?.[0]

  // Check notes for championship keywords
  const notes = competition?.notes ?? []
  const hasChampNote = notes.some((n) =>
    /championship|tournament|march madness/i.test(n.headline ?? n.text ?? '')
  )
  if (hasChampNote) return true

  // Check if tournamentId is present on the competition
  if (competition?.tournamentId) return true

  // groups=100 already filters to the tournament — accept all remaining
  return true
}
