/**
 * Normalize card.squares to a flat 25-element array (index 0 = top-left, 12 = center).
 * Accepts either 5x5 grid (array of rows) or flat array.
 */
function flattenSquares(squares) {
  if (!squares || !Array.isArray(squares)) return []
  const first = squares[0]
  if (Array.isArray(first)) {
    return squares.flat()
  }
  return squares.slice(0, 25)
}

/**
 * Process a stat event against a card and return square IDs that should be marked.
 * A square is marked if:
 * - square.player_id === statEvent.player_id
 * - square.stat_type === statEvent.stat_type
 * - square.marked === false
 * - statEvent.value >= square.threshold
 *
 * @param {Object} statEvent - { player_id: string, stat_type: string, value: number }
 * @param {Object} card - Card from DB with .squares (jsonb, 5x5 or flat)
 * @returns {string[]} Array of square IDs that should now be marked
 */
export function processStatEvent(statEvent, card) {
  if (!statEvent || !card?.squares) return []
  const { player_id, stat_type, value } = statEvent
  if (player_id == null || stat_type == null || value == null) return []

  const flat = flattenSquares(card.squares)
  const toMark = flat.filter(
    (sq) =>
      sq &&
      sq.player_id === player_id &&
      sq.stat_type === stat_type &&
      sq.marked === false &&
      Number(value) >= Number(sq.threshold)
  )
  return toMark.map((sq) => sq.id).filter(Boolean)
}

/** All 12 bingo lines as arrays of square indices (0–24). */
const BINGO_LINES = [
  [0, 1, 2, 3, 4],       // row 0
  [5, 6, 7, 8, 9],       // row 1
  [10, 11, 12, 13, 14],  // row 2
  [15, 16, 17, 18, 19],  // row 3
  [20, 21, 22, 23, 24],  // row 4
  [0, 5, 10, 15, 20],    // col 0
  [1, 6, 11, 16, 21],    // col 1
  [2, 7, 12, 17, 22],    // col 2
  [3, 8, 13, 18, 23],    // col 3
  [4, 9, 14, 19, 24],    // col 4
  [0, 6, 12, 18, 24],    // main diagonal
  [4, 8, 12, 16, 20],    // anti-diagonal
]

/**
 * Check all 12 win lines (5 rows, 5 columns, 2 diagonals) for bingo.
 *
 * @param {Array} squares - 25-square array (flat; index 0 = top-left, 12 = center)
 * @returns {{ hasBingo: boolean, winningLines: number[][] }} winningLines is array of arrays of square indices for each completed line
 */
export function checkBingo(squares) {
  const flat = Array.isArray(squares?.[0])
    ? squares.flat()
    : (squares && squares.length >= 25 ? squares.slice(0, 25) : [])

  const winningLines = BINGO_LINES.filter((line) =>
    line.every((idx) => flat[idx]?.marked === true)
  )

  return {
    hasBingo: winningLines.length > 0,
    winningLines,
  }
}
