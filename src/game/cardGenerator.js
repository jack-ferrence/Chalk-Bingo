/**
 * LEGACY — This card generator uses fabricated stat thresholds and is no longer
 * used in production. All cards are now generated via oddsCardGenerator.js using
 * real player prop odds from TheOddsAPI.
 *
 * Kept for reference only. Do not import or call generateCard() from new code.
 */

// Generic stat types used by odds-based cards (stat_type without threshold).
// The mark_squares_for_event RPC matches on player_id + stat_type + value >= threshold.
export const STAT_TYPES_GENERIC = ['points', 'rebounds', 'assists', 'threes', 'steals', 'blocks']

const TOTAL_SQUARES = 25
const CENTER_INDEX = 12
const NON_CENTER_SQUARES = TOTAL_SQUARES - 1

// Canonical stat_type strings — must match statsProvider.js output exactly.
// The RPC (005_generate_card_rpc.sql) uses the same list.
export const STAT_TYPES = [
  'points_10',
  'points_15',
  'points_20',
  'points_25',
  'rebound_5',
  'rebound_10',
  'assist_5',
  'assist_10',
  'three_pointer',
  'steal',
  'block',
]

const randomId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return (
    Math.random().toString(36).slice(2) + Date.now().toString(36)
  )
}

function getLastName(fullName) {
  const parts = (fullName ?? '').trim().split(/\s+/)
  return parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || ''
}

function buildDisplay(player, statType) {
  const label = player.lastName || getLastName(player.name)

  if (statType.startsWith('points_')) {
    const threshold = Number(statType.split('_')[1]) || 0
    return { threshold, displayText: `${label} ${threshold}+ PTS` }
  }

  if (statType.startsWith('rebound_')) {
    const threshold = Number(statType.split('_')[1]) || 0
    return { threshold, displayText: `${label} ${threshold}+ REB` }
  }

  if (statType.startsWith('assist_')) {
    const threshold = Number(statType.split('_')[1]) || 0
    return { threshold, displayText: `${label} ${threshold}+ AST` }
  }

  switch (statType) {
    case 'three_pointer':
      return { threshold: 1, displayText: `${label} 1+ 3PM` }
    case 'steal':
      return { threshold: 1, displayText: `${label} 1+ STL` }
    case 'block':
      return { threshold: 1, displayText: `${label} 1+ BLK` }
    default:
      return { threshold: 1, displayText: `${label} ${statType}` }
  }
}

function createSquare(player, statType) {
  const { threshold, displayText } = buildDisplay(player, statType)

  return {
    id: randomId(),
    player_id: player.id,
    player_name: player.name,
    stat_type: statType,
    threshold,
    display_text: displayText,
    marked: false,
  }
}

function createFreeSquare() {
  return {
    id: randomId(),
    player_id: null,
    player_name: null,
    stat_type: 'free',
    threshold: 0,
    display_text: 'FREE',
    marked: true,
  }
}

function shuffle(array) {
  const result = array.slice()
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function generateCard(players, statTypes) {
  if (!Array.isArray(players) || players.length === 0) {
    throw new Error('generateCard: players array is required and cannot be empty')
  }
  if (!Array.isArray(statTypes) || statTypes.length === 0) {
    throw new Error('generateCard: statTypes array is required and cannot be empty')
  }

  const uniqueCombinationLimit = players.length * statTypes.length
  const used = new Set()
  const squares = []

  // First pass: unique (player_id, stat_type) combinations as much as possible
  while (squares.length < NON_CENTER_SQUARES && used.size < uniqueCombinationLimit) {
    const player = players[Math.floor(Math.random() * players.length)]
    const statType = statTypes[Math.floor(Math.random() * statTypes.length)]
    const key = `${player.id}:${statType}`

    if (used.has(key)) continue
    used.add(key)
    squares.push(createSquare(player, statType))
  }

  // If we still need more squares, allow duplicates to fill the card
  while (squares.length < NON_CENTER_SQUARES) {
    const player = players[Math.floor(Math.random() * players.length)]
    const statType = statTypes[Math.floor(Math.random() * statTypes.length)]
    squares.push(createSquare(player, statType))
  }

  const shuffled = shuffle(squares)
  const card = []

  for (let i = 0, idx = 0; i < TOTAL_SQUARES; i += 1) {
    if (i === CENTER_INDEX) {
      card.push(createFreeSquare())
    } else {
      card.push(shuffled[idx])
      idx += 1
    }
  }

  return card
}

