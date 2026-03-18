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
  const isProduction = process.env.CONTEXT === 'production'

  // Block entirely in production if no secret is configured
  if (isProduction && !secret) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Trigger disabled in production. Set POLL_TRIGGER_SECRET to enable.' }),
      headers: { 'Content-Type': 'application/json' },
    }
  }

  if (secret && authHeader !== secret) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' }),
      headers: { 'Content-Type': 'application/json' },
    }
  }

  return syncGames()
}
