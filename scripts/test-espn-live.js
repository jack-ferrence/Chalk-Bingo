#!/usr/bin/env node
/**
 * Diagnostic script: verify ESPN stat parsing against a real game.
 *
 * Usage:
 *   node scripts/test-espn-live.js              # auto-picks first live or finished game
 *   node scripts/test-espn-live.js 401584901    # specific game ID
 *
 * Note: fetchEspnStats is not exported from statsProvider.js directly.
 * We use getStatsForGame(id, 'espn') which calls it internally and
 * attaches game_id to each event. Behaviour is identical for diagnostics.
 */

const ESPN_SUMMARY = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary'

// Dynamic import because statsProvider.js uses ESM exports
const { getStatsForGame, fetchLiveEspnGames } = await import('../src/lib/statsProvider.js')

// ---------------------------------------------------------------------------
// 1. Fetch today's games
// ---------------------------------------------------------------------------
console.log('Fetching today\'s ESPN schedule...\n')
let games
try {
  games = await fetchLiveEspnGames()
} catch (err) {
  console.error('Failed to fetch game schedule:', err.message)
  process.exit(1)
}

if (games.length === 0) {
  console.log('No games on today\'s schedule.')
  process.exit(0)
}

console.log(`Today's games (${games.length} total):`)
for (const g of games) {
  console.log(`  ${g.id}  ${g.name}  [${g.status}]`)
}
console.log()

// ---------------------------------------------------------------------------
// 2. Resolve game ID
// ---------------------------------------------------------------------------
const cliGameId = process.argv[2]?.trim()
let gameId

if (cliGameId) {
  const match = games.find((g) => g.id === cliGameId)
  if (!match) {
    console.warn(`Warning: game ID ${cliGameId} not found in today's schedule — trying anyway.`)
  } else {
    console.log(`Using specified game: ${match.name} [${match.status}]`)
  }
  gameId = cliGameId
} else {
  // Auto-pick: prefer live, then finished, then anything
  const live = games.find((g) => g.status === 'STATUS_IN_PROGRESS')
  const finished = games.find((g) => g.status === 'STATUS_FINAL')
  const selected = live ?? finished ?? games[0]
  console.log(`Auto-selected game: ${selected.name} [${selected.status}]`)
  gameId = selected.id
}

console.log(`Game ID: ${gameId}\n`)

// ---------------------------------------------------------------------------
// 3. Call getStatsForGame (wraps fetchEspnStats, adds game_id)
// ---------------------------------------------------------------------------
console.log('Fetching parsed stat events...\n')
let events
try {
  events = await getStatsForGame(gameId, 'espn')
} catch (err) {
  console.error('fetchEspnStats failed:', err.message)
  process.exit(1)
}

console.log(`Total events returned: ${events.length}`)

// ---------------------------------------------------------------------------
// 4. Parse failures — null/undefined/NaN in key fields
// ---------------------------------------------------------------------------
const failures = events.filter(
  (e) =>
    e.player_id == null || e.player_id === '' ||
    e.stat_type == null ||
    e.value == null || (typeof e.value === 'number' && isNaN(e.value))
)

if (failures.length > 0) {
  console.log(`\nPARSE FAILURES (${failures.length}):`)
  for (const f of failures) {
    console.log('  ', JSON.stringify(f))
  }
} else {
  console.log('Parse failures: none')
}

// ---------------------------------------------------------------------------
// 5. Group by player and print stats
// ---------------------------------------------------------------------------
if (events.length > 0) {
  console.log('\nEvents by player:')
  const byPlayer = new Map()
  for (const e of events) {
    const key = e.player_name || e.player_id || '(unknown)'
    if (!byPlayer.has(key)) byPlayer.set(key, [])
    byPlayer.get(key).push({ [e.stat_type]: e.value })
  }
  for (const [name, stats] of byPlayer) {
    const pairs = stats.map((s) => {
      const [k, v] = Object.entries(s)[0]
      return `${k}: ${v}`
    }).join('  |  ')
    console.log(`  ${name}: ${pairs}`)
  }
}

// ---------------------------------------------------------------------------
// 6. Raw ESPN data for visual comparison
// ---------------------------------------------------------------------------
console.log('\n--- Raw ESPN boxscore comparison ---\n')
let raw
try {
  const res = await fetch(`${ESPN_SUMMARY}?event=${gameId}`)
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
  raw = await res.json()
} catch (err) {
  console.error('Raw ESPN fetch failed:', err.message)
  process.exit(1)
}

const teamBlocks = raw.boxscore?.players ?? []
if (teamBlocks.length === 0) {
  console.log('No boxscore.players in ESPN response — game may not have started.')
} else {
  for (const teamBlock of teamBlocks) {
    const teamName = teamBlock.team?.displayName ?? '(team)'
    const statsBlock = teamBlock.statistics?.[0]
    if (!statsBlock) {
      console.log(`${teamName}: no statistics block`)
      continue
    }

    const labels = statsBlock.labels ?? []
    const firstAthlete = statsBlock.athletes?.[0]

    console.log(`${teamName}`)
    console.log(`  Labels (${labels.length}): ${labels.join(', ')}`)

    if (firstAthlete) {
      const name = firstAthlete.athlete?.displayName ?? '(unknown)'
      const stats = firstAthlete.stats ?? []
      console.log(`  First athlete: ${name}`)
      console.log(`  Raw stats:     ${stats.join(', ')}`)

      // Side-by-side label→value
      const pairs = labels.map((l, i) => `${l}=${stats[i] ?? '?'}`).join('  ')
      console.log(`  Mapped:        ${pairs}`)
    } else {
      console.log('  No athletes in this team block.')
    }
    console.log()
  }
}
