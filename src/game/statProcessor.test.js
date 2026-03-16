import { describe, it, expect } from 'vitest'
import { processStatEvent, checkBingo } from './statProcessor.js'

describe('processStatEvent', () => {
  const makeSquare = (id, player_id, stat_type, threshold, marked = false) => ({
    id,
    player_id,
    player_name: 'Player',
    stat_type,
    threshold,
    display_text: `${stat_type} ${threshold}+`,
    marked,
  })

  it('returns square IDs that should be marked when stat matches (player_id, stat_type, value >= threshold)', () => {
    const squares = [
      makeSquare('a1', 'p1', 'points_10', 10, false),
      makeSquare('a2', 'p2', 'points_10', 10, false),
      makeSquare('a3', 'p1', 'rebound', 5, false),
    ]
    const card = { squares }
    const statEvent = { player_id: 'p1', stat_type: 'points_10', value: 15 }
    const result = processStatEvent(statEvent, card)
    expect(result).toEqual(['a1'])
  })

  it('returns empty array when stat does not match (wrong player)', () => {
    const squares = [
      makeSquare('a1', 'p1', 'points_10', 10, false),
    ]
    const card = { squares }
    const statEvent = { player_id: 'p2', stat_type: 'points_10', value: 15 }
    const result = processStatEvent(statEvent, card)
    expect(result).toEqual([])
  })

  it('returns empty array when stat does not match (wrong stat_type)', () => {
    const squares = [
      makeSquare('a1', 'p1', 'points_10', 10, false),
    ]
    const card = { squares }
    const statEvent = { player_id: 'p1', stat_type: 'rebound', value: 10 }
    const result = processStatEvent(statEvent, card)
    expect(result).toEqual([])
  })

  it('does not mark square when value is below threshold', () => {
    const squares = [
      makeSquare('a1', 'p1', 'points_15', 15, false),
    ]
    const card = { squares }
    const statEvent = { player_id: 'p1', stat_type: 'points_15', value: 10 }
    const result = processStatEvent(statEvent, card)
    expect(result).toEqual([])
  })

  it('does not return already marked squares', () => {
    const squares = [
      makeSquare('a1', 'p1', 'points_10', 10, true),
    ]
    const card = { squares }
    const statEvent = { player_id: 'p1', stat_type: 'points_10', value: 15 }
    const result = processStatEvent(statEvent, card)
    expect(result).toEqual([])
  })

  it('works with card.squares as 5x5 grid', () => {
    const card = {
      squares: [
        [
          { id: 'id-0', player_id: 'p1', stat_type: 'points_10', threshold: 10, marked: false },
          null, null, null, null,
        ],
        ...Array(4).fill(Array(5).fill(null)),
      ],
    }
    const statEvent = { player_id: 'p1', stat_type: 'points_10', value: 12 }
    const result = processStatEvent(statEvent, card)
    expect(result).toContain('id-0')
  })

  it('returns empty for missing statEvent or card', () => {
    const card = { squares: [makeSquare('a1', 'p1', 'points_10', 10, false)] }
    expect(processStatEvent(null, card)).toEqual([])
    expect(processStatEvent({ player_id: 'p1', stat_type: 'points_10', value: 10 }, null)).toEqual([])
    expect(processStatEvent({ player_id: 'p1', stat_type: 'points_10', value: 10 }, {})).toEqual([])
  })
})

describe('checkBingo', () => {
  /** Build 25 squares; by default none marked. Indices 0..24. */
  function buildSquares(markedIndices = []) {
    const set = new Set(markedIndices)
    return Array.from({ length: 25 }, (_, i) => ({
      id: `sq-${i}`,
      marked: set.has(i),
    }))
  }

  it('returns hasBingo: false and empty winningLines when no line is complete', () => {
    const squares = buildSquares([0, 1, 2]) // only 3 in first row
    const result = checkBingo(squares)
    expect(result.hasBingo).toBe(false)
    expect(result.winningLines).toEqual([])
  })

  it('returns hasBingo: true and winning line for a completed row', () => {
    const squares = buildSquares([0, 1, 2, 3, 4]) // row 0 complete
    const result = checkBingo(squares)
    expect(result.hasBingo).toBe(true)
    expect(result.winningLines).toHaveLength(1)
    expect(result.winningLines[0]).toEqual([0, 1, 2, 3, 4])
  })

  it('returns hasBingo: true and winning line for a completed column', () => {
    const squares = buildSquares([0, 5, 10, 15, 20]) // col 0 complete
    const result = checkBingo(squares)
    expect(result.hasBingo).toBe(true)
    expect(result.winningLines).toHaveLength(1)
    expect(result.winningLines[0]).toEqual([0, 5, 10, 15, 20])
  })

  it('returns hasBingo: true and winning line for main diagonal (0, 6, 12, 18, 24)', () => {
    const squares = buildSquares([0, 6, 12, 18, 24])
    const result = checkBingo(squares)
    expect(result.hasBingo).toBe(true)
    expect(result.winningLines).toHaveLength(1)
    expect(result.winningLines[0]).toEqual([0, 6, 12, 18, 24])
  })

  it('returns hasBingo: true and winning line for anti-diagonal (4, 8, 12, 16, 20)', () => {
    const squares = buildSquares([4, 8, 12, 16, 20])
    const result = checkBingo(squares)
    expect(result.hasBingo).toBe(true)
    expect(result.winningLines).toHaveLength(1)
    expect(result.winningLines[0]).toEqual([4, 8, 12, 16, 20])
  })

  it('returns multiple winning lines when multiple are complete', () => {
    const squares = buildSquares([0, 1, 2, 3, 4, 0, 5, 10, 15, 20]) // row 0 and col 0
    const result = checkBingo(squares)
    expect(result.hasBingo).toBe(true)
    expect(result.winningLines).toHaveLength(2)
    expect(result.winningLines).toContainEqual([0, 1, 2, 3, 4])
    expect(result.winningLines).toContainEqual([0, 5, 10, 15, 20])
  })

  it('accepts squares as 5x5 grid (flattens internally)', () => {
    const flat = buildSquares([0, 1, 2, 3, 4])
    const grid = [
      flat.slice(0, 5),
      flat.slice(5, 10),
      flat.slice(10, 15),
      flat.slice(15, 20),
      flat.slice(20, 25),
    ]
    const result = checkBingo(grid)
    expect(result.hasBingo).toBe(true)
    expect(result.winningLines[0]).toEqual([0, 1, 2, 3, 4])
  })
})
