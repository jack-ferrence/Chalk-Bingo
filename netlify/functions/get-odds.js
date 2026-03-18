// Fetches NBA player prop odds from TheOddsAPI and returns a tiered prop pool.
// CRITICAL: API key must be set as ODDS_API_KEY environment variable — never hardcoded.

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4'
const SPORT = 'basketball_nba'
const PROP_MARKETS = [
  'player_points',
  'player_rebounds',
  'player_assists',
  'player_threes',
  'player_steals',
  'player_blocks',
]

const MARKET_TO_STAT = {
  player_points:   { stat_type: 'points',   abbr: 'PTS' },
  player_rebounds: { stat_type: 'rebounds',  abbr: 'REB' },
  player_assists:  { stat_type: 'assists',   abbr: 'AST' },
  player_threes:   { stat_type: 'threes',    abbr: '3PM' },
  player_steals:   { stat_type: 'steals',    abbr: 'STL' },
  player_blocks:   { stat_type: 'blocks',    abbr: 'BLK' },
}

// 15-minute in-memory cache keyed by "home|away" (sorted)
const oddsCache = new Map()
const CACHE_TTL = 15 * 60 * 1000

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function normalizeTeam(name) {
  return (name ?? '')
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
}

function teamsMatch(a, b) {
  const na = normalizeTeam(a)
  const nb = normalizeTeam(b)
  return na === nb || na.includes(nb) || nb.includes(na)
}

/** Convert American odds integer to implied probability (0-1). */
function americanToProb(odds) {
  if (odds > 0) return 100 / (odds + 100)
  return Math.abs(odds) / (Math.abs(odds) + 100)
}

/** De-vig a raw implied probability by dividing by assumed overround of 1.05. */
function devig(prob) {
  return Math.min(prob / 1.05, 0.99)
}

function tierForProb(p) {
  if (p >= 0.65) return 'easy'
  if (p >= 0.40) return 'medium'
  if (p >= 0.18) return 'hard'
  return 'longshot'
}

function lastName(fullName) {
  const parts = (fullName ?? '').trim().split(/\s+/)
  return parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || fullName
}

// ---------------------------------------------------------------------------
// Core processing
// ---------------------------------------------------------------------------

/**
 * From all bookmakers' outcomes for a given event, extract the best (most
 * generous) Over lines for each player+market combination.
 * Returns Map keyed by `playerName|marketKey` → { playerName, marketKey, point, bestOdds }
 */
function extractBestLines(eventOdds) {
  // key: `playerName|marketKey|point`
  const best = new Map()

  for (const bookmaker of eventOdds.bookmakers ?? []) {
    for (const market of bookmaker.markets ?? []) {
      const marketKey = market.key
      if (!MARKET_TO_STAT[marketKey]) continue

      for (const outcome of market.outcomes ?? []) {
        if ((outcome.description ?? '').toLowerCase() !== 'over') continue
        const playerName = outcome.name
        const point = outcome.point
        const price = outcome.price
        if (!playerName || point == null || price == null) continue

        const key = `${playerName}|${marketKey}|${point}`
        const existing = best.get(key)

        // Higher odds (less negative / more positive) = more generous = pick it
        if (!existing || price > existing.bestOdds) {
          best.set(key, { playerName, marketKey, point, bestOdds: price })
        }
      }
    }
  }

  return best
}

/** Build the final prop pool from the best lines map. */
function buildPropPool(bestLines, homeTeam, awayTeam) {
  const props = []

  for (const { playerName, marketKey, point, bestOdds } of bestLines.values()) {
    const meta = MARKET_TO_STAT[marketKey]
    if (!meta) continue

    const rawProb = americanToProb(bestOdds)
    const impliedProb = devig(rawProb)
    const tier = tierForProb(impliedProb)
    const last = lastName(playerName)
    const displayText = `${last} ${point}+ ${meta.abbr}`
    const conflictKey = `${playerName}|${meta.stat_type}`

    props.push({
      player_name:   playerName,
      stat_type:     meta.stat_type,
      threshold:     point,
      display_text:  displayText,
      american_odds: bestOdds,
      implied_prob:  Math.round(impliedProb * 1000) / 1000,
      tier,
      conflict_key:  conflictKey,
    })
  }

  return props
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

async function fetchEvents(apiKey) {
  const url = `${ODDS_API_BASE}/sports/${SPORT}/events?apiKey=${apiKey}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TheOddsAPI events returned ${res.status}`)
  return res.json()
}

async function fetchEventOdds(apiKey, eventId) {
  const markets = PROP_MARKETS.join(',')
  const url = `${ODDS_API_BASE}/sports/${SPORT}/events/${eventId}/odds?apiKey=${apiKey}&markets=${markets}&oddsFormat=american&regions=us`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`TheOddsAPI event odds returned ${res.status}`)
  return res.json()
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

exports.handler = async function (event) {
  const apiKey = process.env.ODDS_API_KEY
  if (!apiKey) {
    console.error('get-odds: ODDS_API_KEY env variable not set')
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ props: [], meta: { source: 'none', reason: 'api_key_missing' } }),
    }
  }

  const homeTeam = event.queryStringParameters?.home_team ?? ''
  const awayTeam = event.queryStringParameters?.away_team ?? ''

  if (!homeTeam && !awayTeam) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ props: [], meta: { source: 'none', reason: 'no_teams_provided' } }),
    }
  }

  const cacheKey = [homeTeam, awayTeam].map(normalizeTeam).sort().join('|')
  const now = Date.now()
  const cached = oddsCache.get(cacheKey)
  if (cached && now - cached.ts < CACHE_TTL) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' },
      body: JSON.stringify(cached.data),
    }
  }

  try {
    // Step 1: find the matching event
    const events = await fetchEvents(apiKey)
    const matchedEvent = events.find((e) => {
      const htMatch = teamsMatch(e.home_team, homeTeam) || teamsMatch(e.home_team, awayTeam)
      const atMatch = teamsMatch(e.away_team, awayTeam) || teamsMatch(e.away_team, homeTeam)
      return htMatch && atMatch
    })

    if (!matchedEvent) {
      const result = {
        props: [],
        meta: {
          source: 'none',
          reason: 'event_not_found',
          home_team: homeTeam,
          away_team: awayTeam,
          available_events: events.map((e) => `${e.home_team} vs ${e.away_team}`),
        },
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      }
    }

    // Step 2: fetch props for the matched event
    const eventOdds = await fetchEventOdds(apiKey, matchedEvent.id)
    const bestLines = extractBestLines(eventOdds)
    const props = buildPropPool(bestLines, matchedEvent.home_team, matchedEvent.away_team)

    const result = {
      props,
      meta: {
        source: 'theOddsAPI',
        event_id: matchedEvent.id,
        home_team: matchedEvent.home_team,
        away_team: matchedEvent.away_team,
        prop_count: props.length,
        commence_time: matchedEvent.commence_time,
      },
    }

    oddsCache.set(cacheKey, { data: result, ts: now })
    if (oddsCache.size > 50) {
      const oldest = [...oddsCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0]
      if (oldest) oddsCache.delete(oldest[0])
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=900' },
      body: JSON.stringify(result),
    }
  } catch (err) {
    console.error('get-odds: fetch failed', err.message)
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ props: [], meta: { source: 'none', reason: 'fetch_error', error: err.message } }),
    }
  }
}
