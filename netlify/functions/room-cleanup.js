const Sentry = require('@sentry/node')
const { createClient } = require('@supabase/supabase-js')

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
  })
}

/**
 * Netlify scheduled function — runs once daily at 04:00 UTC.
 *
 * 1. Marks stale live rooms as finished (no stat_events in 3+ hours)
 * 2. Deletes chat_messages and room_participants for rooms finished >7 days ago
 */
exports.handler = async function () {
  const url = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    const msg = 'room-cleanup: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    console.error(msg)
    Sentry.captureMessage(msg, 'error')
    return { statusCode: 500, body: JSON.stringify({ error: msg }) }
  }

  const supabase = createClient(url, serviceKey)

  try {
    const { data: staleCount, error: staleErr } = await supabase.rpc('cleanup_stale_rooms')
    if (staleErr) {
      console.error('room-cleanup: cleanup_stale_rooms failed', staleErr)
      Sentry.captureException(staleErr)
    } else {
      console.log(`room-cleanup: marked ${staleCount} stale rooms as finished`)
    }

    const { data: purgeResult, error: purgeErr } = await supabase.rpc('cleanup_old_room_data')
    if (purgeErr) {
      console.error('room-cleanup: cleanup_old_room_data failed', purgeErr)
      Sentry.captureException(purgeErr)
    } else {
      console.log('room-cleanup: purged old data', purgeResult)
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        stale_rooms_finished: staleCount ?? 0,
        purge: purgeResult ?? {},
      }),
      headers: { 'Content-Type': 'application/json' },
    }
  } catch (err) {
    console.error('room-cleanup: error', err)
    Sentry.captureException(err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
