const { createClient } = require('@supabase/supabase-js')

// Same mock player IDs as GamePage (Phase 1)
const MOCK_PLAYER_IDS = [
  'player_lebron',
  'player_curry',
  'player_giannis',
  'player_jokic',
  'player_durant',
  'player_tatum',
  'player_doncic',
  'player_embiid',
  'player_booker',
  'player_mitchell',
]

const STAT_TYPES = [
  'points_10',
  'points_15',
  'three_pointer',
  'rebound',
  'assist',
  'steal',
  'block',
]

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Generate a random value that satisfies the stat type (e.g. points_10 => >= 10). */
function randomValueForStatType(statType) {
  switch (statType) {
    case 'points_10':
      return randomInt(10, 45)
    case 'points_15':
      return randomInt(15, 50)
    case 'three_pointer':
    case 'steal':
    case 'block':
      return randomInt(0, 6)
    case 'rebound':
    case 'assist':
      return randomInt(0, 18)
    default:
      return randomInt(0, 20)
  }
}

/** Generate 1–3 random mock stat events for a game_id. */
function generateMockEvents(gameId) {
  const count = randomInt(1, 3)
  const events = []
  for (let i = 0; i < count; i++) {
    const stat_type = pick(STAT_TYPES)
    const value = randomValueForStatType(stat_type)
    const period = randomInt(1, 4)
    events.push({
      game_id: gameId,
      player_id: pick(MOCK_PLAYER_IDS),
      stat_type,
      value,
      period,
    })
  }
  return events
}

/**
 * Netlify scheduled function: poll mock stats, insert into stat_events, then mark cards.
 * Uses SUPABASE_SERVICE_ROLE_KEY (server-side only).
 */
exports.handler = async function (event, context) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('poll-stats: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return { statusCode: 500, body: 'Missing Supabase config' }
  }

  const supabase = createClient(url, serviceKey)
  const log = []

  try {
    // 1. All rooms with status = 'live', get game_ids
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('game_id')
      .eq('status', 'live')

    if (roomsError) {
      console.error('poll-stats: rooms query failed', roomsError)
      return { statusCode: 500, body: roomsError.message }
    }

    const gameIds = [...new Set((rooms || []).map((r) => r.game_id))]
    log.push(`Live games: ${gameIds.length} (${gameIds.join(', ') || 'none'})`)

    if (gameIds.length === 0) {
      console.log('poll-stats:', log.join(' | '))
      return { statusCode: 200, body: JSON.stringify({ updated: 0, log }) }
    }

    let inserted = 0
    let totalCardsMarked = 0

    for (const gameId of gameIds) {
      const events = generateMockEvents(gameId)
      log.push(`game_id=${gameId} generated ${events.length} events`)

      for (const ev of events) {
        // 2. Insert with ON CONFLICT DO NOTHING (idempotency) — unique on (game_id, player_id, stat_type, value, period)
        const { error: insertError } = await supabase.from('stat_events').insert({
          game_id: ev.game_id,
          player_id: ev.player_id,
          stat_type: ev.stat_type,
          value: ev.value,
          period: ev.period,
        })

        if (insertError) {
          if (insertError.code === '23505') {
            // unique violation = already exists, skip
            continue
          }
          console.error('poll-stats: insert failed', insertError)
          continue
        }

        inserted += 1

        // 3. Call mark_squares_for_event for this event
        const { data: cardsUpdated, error: rpcError } = await supabase.rpc(
          'mark_squares_for_event',
          {
            p_game_id: gameId,
            p_stat_event: {
              player_id: ev.player_id,
              stat_type: ev.stat_type,
              value: ev.value,
            },
          }
        )

        if (rpcError) {
          console.error('poll-stats: mark_squares_for_event failed', rpcError)
        } else {
          totalCardsMarked += Number(cardsUpdated) || 0
        }
      }
    }

    log.push(`Inserted ${inserted} new events; cards updated: ${totalCardsMarked}`)
    console.log('poll-stats:', log.join(' | '))

    return {
      statusCode: 200,
      body: JSON.stringify({
        liveGames: gameIds.length,
        eventsInserted: inserted,
        cardsUpdated: totalCardsMarked,
        log,
      }),
    }
  } catch (err) {
    console.error('poll-stats: error', err)
    return { statusCode: 500, body: err.message }
  }
}
