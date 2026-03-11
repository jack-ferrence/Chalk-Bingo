import { createClient } from '@supabase/supabase-js'

const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// In-memory cache: reused across warm invocations to avoid hammering ESPN
let scheduleCache = { data: null, ts: 0 }

/**
 * Netlify scheduled function (runs every 5 minutes via cron).
 *
 * For each NBA game that is scheduled or in-progress today:
 *   1. Check if a public room already exists for that game_id
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
      const res = await fetch(ESPN_SCOREBOARD)
      if (!res.ok) throw new Error(`ESPN returned ${res.status}`)
      const raw = await res.json()
      games = parseGames(raw.events ?? [])
      scheduleCache = { data: games, ts: now }
      log.push(`schedule: fetched ${games.length} game(s) from ESPN`)
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
    .select('game_id')
    .eq('room_type', 'public')
    .neq('status', 'finished')
    .in('game_id', gameIds)

  if (fetchErr) {
    console.error('sync-games: existing rooms query failed', fetchErr)
    return { statusCode: 500, body: JSON.stringify({ error: fetchErr.message }) }
  }

  const existingGameIds = new Set((existingRooms ?? []).map((r) => r.game_id))

  let created = 0
  for (const game of actionable) {
    if (existingGameIds.has(game.id)) continue

    const { error: insertErr } = await supabase.from('rooms').insert({
      name: game.roomName,
      game_id: game.id,
      room_type: 'public',
      status: 'lobby',
      starts_at: game.startsAt,
      created_by: null,
    })

    if (insertErr) {
      // Unique constraint violation = another invocation beat us to it — not an error
      if (insertErr.code === '23505') {
        log.push(`${game.id}: already created (race)`)
        continue
      }
      console.error(`sync-games: insert failed for game ${game.id}`, insertErr)
      log.push(`${game.id}: INSERT FAILED — ${insertErr.message}`)
      continue
    }

    created++
    log.push(`created room for ${game.id} (${game.roomName})`)
    console.log(`sync-games: created public room for game ${game.id} — ${game.roomName}`)
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

function parseGames(events) {
  return events.map((event) => {
    const competition = event.competitions?.[0]
    const competitors = competition?.competitors ?? []

    const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[1]
    const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[0]

    const homeAbbr = home?.team?.abbreviation ?? 'HOM'
    const awayAbbr = away?.team?.abbreviation ?? 'AWY'

    return {
      id: String(event.id),
      status: event.status?.type?.name ?? '',
      roomName: `${awayAbbr} vs ${homeAbbr}`,
      startsAt: event.date ?? null,
    }
  })
}
