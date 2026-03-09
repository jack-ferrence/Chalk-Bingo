import * as Sentry from '@sentry/node'
import { createClient } from '@supabase/supabase-js'
import { getStatsForGame } from '../../src/lib/statsProvider.js'

const LOCK_KEY = 'poll-stats'
const LOCK_TTL_SECONDS = 50

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.2,
  })
}

/**
 * Netlify scheduled function (runs every minute via cron).
 *
 * Flow:
 *   1. Acquire polling lock (skip if another invocation holds it)
 *   2. Query live rooms for active game_ids
 *   3. Fetch stats from ESPN or mock provider
 *   4. Upsert stat_events (ON CONFLICT DO NOTHING via 23505)
 *   5. Run mark_squares_for_event for each new event
 *   6. Release lock
 *
 * Env vars (set in Netlify dashboard):
 *   SUPABASE_URL              — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (server-side only)
 *   STATS_SOURCE              — "espn" | "mock" (default: "mock")
 *   SENTRY_DSN                — Sentry DSN for error monitoring
 */
export async function handler() {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const statsSource = (process.env.STATS_SOURCE || 'mock').toLowerCase()

  const missing = []
  if (!url) missing.push('SUPABASE_URL')
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length > 0) {
    const msg = `poll-stats: Missing required env var(s): ${missing.join(', ')}. Set them in the Netlify dashboard under Site Settings > Environment Variables.`
    console.error(msg)
    Sentry.captureMessage(msg, 'error')
    return {
      statusCode: 500,
      body: JSON.stringify({ error: msg }),
      headers: { 'Content-Type': 'application/json' },
    }
  }

  const supabase = createClient(url, serviceKey)
  const log = []

  // ── Step 1: Acquire lock ──
  try {
    const { data: acquired, error: lockErr } = await supabase.rpc('acquire_polling_lock', {
      p_key: LOCK_KEY,
      p_owner: `netlify-${Date.now()}`,
      p_ttl_seconds: LOCK_TTL_SECONDS,
    })

    if (lockErr) {
      console.warn('poll-stats: lock RPC failed, proceeding anyway', lockErr.message)
    } else if (!acquired) {
      console.log('poll-stats: skipped — another invocation holds the lock')
      return {
        statusCode: 200,
        body: JSON.stringify({ skipped: true, reason: 'lock held' }),
        headers: { 'Content-Type': 'application/json' },
      }
    }
  } catch (lockCatchErr) {
    console.warn('poll-stats: lock check failed, proceeding anyway', lockCatchErr.message)
  }

  try {
    // ── Step 2: Find live games ──
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('game_id')
      .eq('status', 'live')

    if (roomsError) {
      console.error('poll-stats: rooms query failed', roomsError)
      Sentry.captureException(roomsError)
      return { statusCode: 500, body: JSON.stringify({ error: roomsError.message }) }
    }

    const gameIds = [...new Set((rooms || []).map((r) => r.game_id))]
    log.push(`source=${statsSource} | Live games: ${gameIds.length} (${gameIds.join(', ') || 'none'})`)

    if (gameIds.length === 0) {
      console.log('poll-stats:', log.join(' | '))
      await releaseLock(supabase)
      return {
        statusCode: 200,
        body: JSON.stringify({ updated: 0, log }),
        headers: { 'Content-Type': 'application/json' },
      }
    }

    // ── Step 3–5: Fetch, upsert, mark ──
    let inserted = 0
    let totalCardsMarked = 0

    for (const gameId of gameIds) {
      Sentry.setTag('game_id', gameId)

      let events
      try {
        events = await getStatsForGame(gameId, statsSource)
      } catch (fetchErr) {
        log.push(`game_id=${gameId} fetch failed: ${fetchErr.message}`)
        Sentry.captureException(fetchErr, { tags: { game_id: gameId } })
        continue
      }
      log.push(`game_id=${gameId} got ${events.length} events`)

      for (const ev of events) {
        const { error: insertError } = await supabase.from('stat_events').insert({
          game_id: ev.game_id ?? gameId,
          player_id: ev.player_id,
          stat_type: ev.stat_type,
          value: ev.value,
          period: ev.period,
        })

        if (insertError) {
          if (insertError.code === '23505') continue
          console.error('poll-stats: insert failed', insertError)
          Sentry.captureException(insertError, { tags: { game_id: gameId } })
          continue
        }

        inserted += 1

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
          Sentry.captureException(rpcError, { tags: { game_id: gameId } })
        } else {
          totalCardsMarked += Number(cardsUpdated) || 0
        }
      }
    }

    log.push(`Inserted ${inserted} new events; cards updated: ${totalCardsMarked}`)
    console.log('poll-stats:', log.join(' | '))

    // ── Step 6: Release lock ──
    await releaseLock(supabase)

    return {
      statusCode: 200,
      body: JSON.stringify({
        source: statsSource,
        liveGames: gameIds.length,
        eventsInserted: inserted,
        cardsUpdated: totalCardsMarked,
        log,
      }),
      headers: { 'Content-Type': 'application/json' },
    }
  } catch (err) {
    console.error('poll-stats: error', err)
    Sentry.captureException(err)
    await releaseLock(supabase).catch(() => {})
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}

async function releaseLock(supabase) {
  try {
    await supabase.rpc('release_polling_lock', { p_key: LOCK_KEY })
  } catch (e) {
    console.warn('poll-stats: failed to release lock', e.message)
  }
}
