/**
 * HTTP wrapper for manually triggering sync-games logic locally.
 * Call via: curl http://localhost:8888/.netlify/functions/sync-games-trigger
 *
 * LOCAL DEV ONLY. In production, sync-games runs on its cron schedule.
 * Optionally protected by POLL_TRIGGER_SECRET (same secret as poll-stats-trigger).
 */
import { handler as syncGames } from './sync-games.js'

export async function handler(event) {
  const authHeader = event.headers?.['x-trigger-secret'] ?? ''
  const secret = process.env.POLL_TRIGGER_SECRET ?? ''

  if (secret && authHeader !== secret) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
      headers: { 'Content-Type': 'application/json' },
    }
  }

  return syncGames()
}
