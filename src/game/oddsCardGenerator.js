/**
 * Odds-based card generator for Dabber.
 *
 * Architecture matches the Super Bowl Prop Bingo system:
 * - Props come from TheOddsAPI with real American odds
 * - Cards have weighted tier quotas for balanced difficulty
 * - Conflict keys prevent redundant props (same player + same stat family)
 * - Every card has equal expected value but different specific props
 *
 * Difficulty profiles (24 non-free squares):
 *
 *   easy     — Tier 1 heavy (high-prob props), minProb 0.48
 *              Tier 1 (≥55% implied): 12 squares
 *              Tier 2 (45-54%):        8 squares
 *              Tier 3 (<45%):          4 squares
 *
 *   standard — Balanced (default), minProb 0.32
 *              Tier 1: 8 squares
 *              Tier 2: 10 squares
 *              Tier 3: 6 squares
 *
 *   hard     — Tier 3 heavy (low-prob props), minProb 0.20
 *              Tier 1: 4 squares
 *              Tier 2: 8 squares
 *              Tier 3: 12 squares
 */

const DIFFICULTY_PROFILES = {
  easy:     { quotas: { 1: 12, 2: 8,  3: 4  }, minProb: 0.48 },
  standard: { quotas: { 1: 8,  2: 10, 3: 6  }, minProb: 0.32 },
  hard:     { quotas: { 1: 4,  2: 8,  3: 12 }, minProb: 0.20 },
}

const TOTAL_SQUARES = 25
const CENTER_INDEX = 12
const MAX_PICK_ATTEMPTS = 100
const DIFFICULTY_BIAS = {
  1: 2.0,  // easy: strong weight
  2: 1.5,  // medium: moderate weight
  3: 1.0,  // hard: base weight
}

export function getDifficultyProfile(name) {
  return DIFFICULTY_PROFILES[name] ?? DIFFICULTY_PROFILES.standard
}

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function shuffle(arr) {
  const r = arr.slice()
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

function getLastName(fullName) {
  const parts = (fullName ?? '').trim().split(/\s+/)
  return parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || ''
}

function normalizeName(name) {
  return (name ?? '').toLowerCase().replace(/[^a-z]/g, '')
}

/**
 * Pick one prop from pool using weighted random, respecting conflict keys.
 */
function pickOneWeighted(pool, usedIds, usedConflictKeys, tier) {
  const candidates = pool.filter(p =>
    p.tier === tier &&
    !usedIds.has(p.display_text) &&
    !usedConflictKeys.has(p.conflict_key)
  )
  if (candidates.length === 0) return null

  const weights = candidates.map(c => DIFFICULTY_BIAS[c.tier] || 1)
  const total = weights.reduce((a, b) => a + b, 0)
  let roll = Math.random() * total
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return candidates[i]
  }
  return candidates[candidates.length - 1]
}

/**
 * Match odds props to ESPN roster players by name.
 * Only returns props that matched a roster player (with ESPN player_id attached).
 *
 * @param {Array} oddsProps - from get-odds.js: { player_name, stat_type, threshold, ... }
 * @param {Array} rosterPlayers - from get-roster: { id, name, lastName, ... }
 * @returns {Array} matched props with player_id attached
 */
export function matchOddsToRoster(oddsProps, rosterPlayers) {
  if (!rosterPlayers?.length) return []

  // Build lookup maps
  const byFullName = new Map()
  const byLastName = new Map()

  for (const player of rosterPlayers) {
    byFullName.set(normalizeName(player.name), player)
    const last = normalizeName(player.lastName || getLastName(player.name))
    if (last && !byLastName.has(last)) {
      byLastName.set(last, player)
    }
  }

  const matched = []
  for (const prop of oddsProps) {
    const fullNorm = normalizeName(prop.player_name)
    const lastNorm = normalizeName(getLastName(prop.player_name))
    const match = byFullName.get(fullNorm) || (lastNorm ? byLastName.get(lastNorm) : null)
    if (match) {
      matched.push({ ...prop, player_id: match.id, player_name: match.name })
    }
  }
  return matched
}

/**
 * Generate a single bingo card from matched odds props.
 * Returns flat array of 25 squares, or null if not enough props.
 *
 * @param {Array}  matchedProps - output of matchOddsToRoster
 * @param {string} difficulty   - 'easy' | 'standard' | 'hard' (default 'standard')
 * @returns {Array|null} flat 25-element array or null if insufficient props
 */
export function generateOddsBasedCard(matchedProps, difficulty = 'standard') {
  if (!matchedProps?.length) return null

  const profile = getDifficultyProfile(difficulty)
  // Filter pool to props whose implied_prob meets the profile's minimum
  const pool = matchedProps.filter(p => (p.implied_prob ?? 0) >= profile.minProb)
  if (pool.length < 24) return null

  const selected = []
  const usedIds = new Set()
  const usedConflictKeys = new Set()

  // First pass: fill exact tier quotas
  for (const [tier, quota] of Object.entries(profile.quotas)) {
    let picked = 0
    const t = Number(tier)

    for (let attempt = 0; attempt < MAX_PICK_ATTEMPTS && picked < quota; attempt++) {
      const prop = pickOneWeighted(pool, usedIds, usedConflictKeys, t)
      if (!prop) break
      usedIds.add(prop.display_text)
      usedConflictKeys.add(prop.conflict_key)
      selected.push(prop)
      picked++
    }
  }

  // Second pass: backfill from any tier if quotas weren't fully met
  for (let attempt = 0; attempt < MAX_PICK_ATTEMPTS * 3 && selected.length < 24; attempt++) {
    for (const t of [2, 1, 3]) {
      const prop = pickOneWeighted(pool, usedIds, usedConflictKeys, t)
      if (prop) {
        usedIds.add(prop.display_text)
        usedConflictKeys.add(prop.conflict_key)
        selected.push(prop)
        break
      }
    }
  }

  // Must have 24 real props — no fabrication
  if (selected.length < 24) return null

  // Shuffle all 24 selected — completely random positions
  const shuffled = shuffle(selected)

  // Build 25-square card with FREE at center (index 12)
  const card = []
  let idx = 0
  for (let i = 0; i < TOTAL_SQUARES; i++) {
    if (i === CENTER_INDEX) {
      card.push({
        id: randomId(),
        player_id: null,
        player_name: null,
        stat_type: 'free',
        threshold: 0,
        display_text: 'FREE',
        american_odds: null,
        implied_prob: 1.0,
        tier: 0,
        conflict_key: null,
        marked: true,
      })
    } else {
      const p = shuffled[idx++]
      card.push({
        id: randomId(),
        player_id: p.player_id,
        player_name: p.player_name,
        stat_type: p.stat_type,
        threshold: p.threshold,
        display_text: p.display_text,
        american_odds: p.american_odds,
        implied_prob: p.implied_prob,
        tier: p.tier,
        conflict_key: p.conflict_key,
        marked: false,
      })
    }
  }

  return card
}

/**
 * Find a swap candidate: a prop from the pool with American odds
 * within ±25 of the original, not already on the card, respecting conflict keys.
 *
 * @param {Object} originalSquare - the square being replaced (needs american_odds)
 * @param {Array}  fullPropPool   - output of matchOddsToRoster (the full matched pool)
 * @param {Array}  currentCardSquares - all 25 squares currently on the card
 * @returns {Object|null} a candidate prop (same shape as pool entry), or null
 */
export function findSwapCandidate(originalSquare, fullPropPool, currentCardSquares) {
  const candidates = findSwapCandidates(originalSquare, fullPropPool, currentCardSquares, 1)
  return candidates.length > 0 ? candidates[0] : null
}

/**
 * Find up to N swap candidates within ±25 American odds,
 * not conflicting with current card squares.
 *
 * @param {Object} originalSquare     - the square being replaced (needs american_odds)
 * @param {Array}  fullPropPool       - output of matchOddsToRoster (the full matched pool)
 * @param {Array}  currentCardSquares - all 25 squares currently on the card
 * @param {number} count              - max number of candidates to return (default 5)
 * @param {string} difficulty         - 'easy' | 'standard' | 'hard' (default 'standard')
 * @returns {Array} array of up to `count` candidate props
 */
export function findSwapCandidates(originalSquare, fullPropPool, currentCardSquares, count = 5, difficulty = 'standard') {
  if (!fullPropPool?.length) return []
  const origOdds = originalSquare?.american_odds
  if (origOdds == null) return []

  const profile = getDifficultyProfile(difficulty)

  const usedConflictKeys = new Set()
  const usedDisplayTexts = new Set()
  for (const sq of currentCardSquares ?? []) {
    if (sq?.conflict_key) usedConflictKeys.add(sq.conflict_key)
    if (sq?.display_text) usedDisplayTexts.add(sq.display_text)
  }

  const candidates = fullPropPool.filter(p =>
    p.american_odds != null &&
    Math.abs(p.american_odds - origOdds) <= 25 &&
    (p.implied_prob ?? 0) >= profile.minProb &&
    !usedConflictKeys.has(p.conflict_key) &&
    !usedDisplayTexts.has(p.display_text) &&
    p.display_text !== originalSquare.display_text
  )

  if (candidates.length === 0) return []
  const shuffled = shuffle(candidates)
  return shuffled.slice(0, count)
}
