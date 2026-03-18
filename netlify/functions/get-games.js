const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard'

let cache = { data: null, ts: 0 }
const CACHE_TTL = 60_000

function parseGame(event) {
  const competition = event.competitions?.[0]
  const statusObj = event.status ?? {}
  const statusType = statusObj.type?.name ?? ''
  const statusDetail = statusObj.type?.shortDetail ?? statusObj.displayClock ?? ''
  const period = statusObj.period ?? 0

  const teams = (competition?.competitors ?? []).map((c) => ({
    id: c.team?.id ?? '',
    abbr: c.team?.abbreviation ?? '',
    name: c.team?.displayName ?? c.team?.shortDisplayName ?? '',
    logo: c.team?.logo ?? '',
    score: c.score ?? '0',
    homeAway: c.homeAway ?? '',
  }))

  const home = teams.find((t) => t.homeAway === 'home') ?? teams[1]
  const away = teams.find((t) => t.homeAway === 'away') ?? teams[0]

  return {
    id: String(event.id),
    sport: 'nba',
    name: event.name ?? '',
    shortName: event.shortName ?? '',
    date: event.date ?? '',
    statusName: statusType,
    statusDetail,
    period,
    isLive: statusType === 'STATUS_IN_PROGRESS',
    isFinished: statusType === 'STATUS_FINAL',
    isScheduled: statusType === 'STATUS_SCHEDULED',
    home,
    away,
  }
}

function sortGames(games) {
  return [...games].sort((a, b) => {
    const rank = (g) => {
      if (g.isLive) return 0
      if (g.isScheduled) return 1
      if (g.isFinished) return 2
      return 3
    }
    return rank(a) - rank(b)
  })
}

exports.handler = async function () {
  const now = Date.now()

  if (cache.data && now - cache.ts < CACHE_TTL) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      body: JSON.stringify(cache.data),
    }
  }

  // Build tomorrow's date string in YYYYMMDD format (UTC)
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10).replace(/-/g, '')

  try {
    const [todayRes, tomorrowRes] = await Promise.all([
      fetch(ESPN_SCOREBOARD),
      fetch(`${ESPN_SCOREBOARD}?dates=${tomorrowStr}`),
    ])

    if (!todayRes.ok) {
      throw new Error(`ESPN returned ${todayRes.status} for today`)
    }

    const todayRaw = await todayRes.json()
    const todayGames = (todayRaw.events ?? []).map(parseGame)

    // Tomorrow's fetch is non-fatal — fall back to empty array if it fails
    let tomorrowGames = []
    if (tomorrowRes.ok) {
      try {
        const tomorrowRaw = await tomorrowRes.json()
        tomorrowGames = (tomorrowRaw.events ?? []).map(parseGame)
      } catch (parseErr) {
        console.warn('get-games: failed to parse tomorrow ESPN response', parseErr.message)
      }
    } else {
      console.warn(`get-games: ESPN returned ${tomorrowRes.status} for tomorrow — skipping`)
    }

    // Combine and deduplicate by game ID (today takes precedence for live status)
    const seenIds = new Set()
    const combined = []
    for (const game of [...todayGames, ...tomorrowGames]) {
      if (!seenIds.has(game.id)) {
        seenIds.add(game.id)
        combined.push(game)
      }
    }

    const games = sortGames(combined)

    const result = {
      date: todayRaw.day?.date ?? new Date().toISOString().slice(0, 10),
      games,
    }

    cache = { data: result, ts: now }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      body: JSON.stringify(result),
    }
  } catch (err) {
    console.error('get-games: ESPN fetch failed', err)
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Failed to fetch games from ESPN', detail: err.message }),
    }
  }
}
