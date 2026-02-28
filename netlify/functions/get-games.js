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

exports.handler = async function () {
  const now = Date.now()

  if (cache.data && now - cache.ts < CACHE_TTL) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      body: JSON.stringify(cache.data),
    }
  }

  try {
    const res = await fetch(ESPN_SCOREBOARD)
    if (!res.ok) {
      throw new Error(`ESPN returned ${res.status}`)
    }

    const raw = await res.json()
    const games = (raw.events ?? []).map(parseGame)

    const result = {
      date: raw.day?.date ?? new Date().toISOString().slice(0, 10),
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
