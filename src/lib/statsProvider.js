const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard'
const ESPN_SUMMARY = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary'

const STAT_THRESHOLDS = {
  points:   [25, 20, 15, 10],
  rebounds: [10, 5],
  assists:  [10, 5],
}

function parsePlayerStats(athlete, period) {
  const events = []
  const pid = String(athlete.athlete?.id ?? '')
  const pname = athlete.athlete?.displayName ?? ''
  if (!pid) return events

  const stats = athlete.stats ?? []
  // ESPN box score stat order (standard): MIN PTS REB AST STL BLK TO FG 3PT FT +/- (varies slightly)
  // We'll use the stat labels from the header to be safe, but also provide a positional fallback.
  const pts = Number(stats[1]) || 0
  const reb = Number(stats[2]) || 0
  const ast = Number(stats[3]) || 0
  const stl = Number(stats[4]) || 0
  const blk = Number(stats[5]) || 0
  const threes = parseThreePointers(stats[8] ?? stats[7] ?? '0')

  for (const threshold of STAT_THRESHOLDS.points) {
    if (pts >= threshold) {
      events.push({ player_id: pid, player_name: pname, stat_type: `points_${threshold}`, value: pts, period })
    }
  }

  for (const threshold of STAT_THRESHOLDS.rebounds) {
    if (reb >= threshold) {
      events.push({ player_id: pid, player_name: pname, stat_type: `rebound_${threshold}`, value: reb, period })
    }
  }

  for (const threshold of STAT_THRESHOLDS.assists) {
    if (ast >= threshold) {
      events.push({ player_id: pid, player_name: pname, stat_type: `assist_${threshold}`, value: ast, period })
    }
  }

  if (threes >= 1) {
    events.push({ player_id: pid, player_name: pname, stat_type: 'three_pointer', value: threes, period })
  }
  if (stl >= 1) {
    events.push({ player_id: pid, player_name: pname, stat_type: 'steal', value: stl, period })
  }
  if (blk >= 1) {
    events.push({ player_id: pid, player_name: pname, stat_type: 'block', value: blk, period })
  }

  return events
}

function parseThreePointers(fgStr) {
  // ESPN formats 3PT as "made-attempted", e.g. "3-7"
  const match = String(fgStr).match(/^(\d+)/)
  return match ? Number(match[1]) : 0
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`ESPN fetch failed: ${res.status} ${res.statusText} for ${url}`)
  return res.json()
}

/**
 * Fetch live stat events from ESPN for a specific game.
 * @param {string} espnGameId - ESPN event ID (the game_id stored in rooms)
 * @returns {Promise<Array<{player_id, player_name, stat_type, value, period}>>}
 */
async function fetchEspnStats(espnGameId) {
  const data = await fetchJson(`${ESPN_SUMMARY}?event=${espnGameId}`)

  const boxScore = data.boxscore
  if (!boxScore?.players?.length) return []

  const period = data.header?.competitions?.[0]?.status?.period ?? 0
  const events = []

  for (const team of boxScore.players) {
    const statLabels = team.statistics?.[0]?.labels ?? []
    const athletes = team.statistics?.[0]?.athletes ?? []

    for (const athlete of athletes) {
      if (!athlete.stats?.length || athlete.didNotPlay) continue

      const mapped = mapStatsByLabel(athlete, statLabels, period)
      if (mapped.length) {
        events.push(...mapped)
      } else {
        events.push(...parsePlayerStats(athlete, period))
      }
    }
  }

  return events
}

/**
 * Label-aware stat mapping. More reliable than positional indexing.
 */
function mapStatsByLabel(athlete, labels, period) {
  const events = []
  const pid = String(athlete.athlete?.id ?? '')
  const pname = athlete.athlete?.displayName ?? ''
  if (!pid || !labels.length) return events

  const statMap = {}
  labels.forEach((label, i) => {
    statMap[label.toUpperCase()] = athlete.stats[i] ?? '0'
  })

  const pts = Number(statMap['PTS']) || 0
  const reb = Number(statMap['REB']) || 0
  const ast = Number(statMap['AST']) || 0
  const stl = Number(statMap['STL']) || 0
  const blk = Number(statMap['BLK']) || 0
  const threes = parseThreePointers(statMap['3PT'] ?? statMap['3PM'] ?? '0')

  for (const threshold of STAT_THRESHOLDS.points) {
    if (pts >= threshold) {
      events.push({ player_id: pid, player_name: pname, stat_type: `points_${threshold}`, value: pts, period })
    }
  }
  for (const threshold of STAT_THRESHOLDS.rebounds) {
    if (reb >= threshold) {
      events.push({ player_id: pid, player_name: pname, stat_type: `rebound_${threshold}`, value: reb, period })
    }
  }
  for (const threshold of STAT_THRESHOLDS.assists) {
    if (ast >= threshold) {
      events.push({ player_id: pid, player_name: pname, stat_type: `assist_${threshold}`, value: ast, period })
    }
  }
  if (threes >= 1) {
    events.push({ player_id: pid, player_name: pname, stat_type: 'three_pointer', value: threes, period })
  }
  if (stl >= 1) {
    events.push({ player_id: pid, player_name: pname, stat_type: 'steal', value: stl, period })
  }
  if (blk >= 1) {
    events.push({ player_id: pid, player_name: pname, stat_type: 'block', value: blk, period })
  }

  return events
}

/**
 * Fetch today's live ESPN game IDs from the scoreboard.
 * @returns {Promise<Array<{id: string, name: string, status: string}>>}
 */
async function fetchLiveEspnGames() {
  const data = await fetchJson(ESPN_SCOREBOARD)
  const games = []
  for (const event of data.events ?? []) {
    const status = event.status?.type?.name ?? ''
    games.push({
      id: String(event.id),
      name: event.name ?? '',
      status,
    })
  }
  return games
}

// ---------------------------------------------------------------------------
// Mock fallback (same players/stat types as the card generator)
// ---------------------------------------------------------------------------

const MOCK_PLAYERS = [
  { id: '2544',   name: 'LeBron James' },
  { id: '3975',   name: 'Stephen Curry' },
  { id: '3032977', name: 'Giannis Antetokounmpo' },
  { id: '3112335', name: 'Nikola Jokić' },
  { id: '3202',   name: 'Kevin Durant' },
  { id: '4065648', name: 'Jayson Tatum' },
  { id: '3945274', name: 'Luka Dončić' },
  { id: '3059318', name: 'Joel Embiid' },
  { id: '3136193', name: 'Devin Booker' },
  { id: '3908809', name: 'Donovan Mitchell' },
]

const MOCK_STAT_TYPES = [
  { stat_type: 'points_10',     min: 10, max: 45 },
  { stat_type: 'points_15',     min: 15, max: 50 },
  { stat_type: 'points_20',     min: 20, max: 50 },
  { stat_type: 'points_25',     min: 25, max: 55 },
  { stat_type: 'three_pointer', min: 1,  max: 8 },
  { stat_type: 'rebound_5',     min: 5,  max: 18 },
  { stat_type: 'rebound_10',    min: 10, max: 20 },
  { stat_type: 'assist_5',      min: 5,  max: 15 },
  { stat_type: 'assist_10',     min: 10, max: 18 },
  { stat_type: 'steal',         min: 1,  max: 5 },
  { stat_type: 'block',         min: 1,  max: 5 },
]

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateMockEvents(gameId) {
  const count = randomInt(1, 3)
  const events = []
  for (let i = 0; i < count; i++) {
    const player = pick(MOCK_PLAYERS)
    const st = pick(MOCK_STAT_TYPES)
    events.push({
      game_id: gameId,
      player_id: player.id,
      player_name: player.name,
      stat_type: st.stat_type,
      value: randomInt(st.min, st.max),
      period: randomInt(1, 4),
    })
  }
  return events
}

/**
 * Get stat events for a game_id.
 * Uses ESPN if source === 'espn', otherwise generates mock data.
 * Falls back to mock if ESPN fetch fails.
 *
 * @param {string} gameId
 * @param {'espn'|'mock'} source
 * @returns {Promise<Array<{game_id, player_id, player_name, stat_type, value, period}>>}
 */
async function getStatsForGame(gameId, source = 'mock') {
  if (source === 'espn') {
    try {
      const raw = await fetchEspnStats(gameId)
      return raw.map((ev) => ({ ...ev, game_id: gameId }))
    } catch (err) {
      console.warn(`statsProvider: ESPN fetch failed for ${gameId}, falling back to mock:`, err.message)
      return generateMockEvents(gameId)
    }
  }
  return generateMockEvents(gameId)
}

module.exports = {
  getStatsForGame,
  fetchLiveEspnGames,
  generateMockEvents,
  MOCK_PLAYERS,
}
