/**
 * HTTP wrapper for manually triggering poll-stats logic locally.
 * Call via: netlify functions:invoke poll-stats-trigger
 * or GET /.netlify/functions/poll-stats-trigger
 *
 * This file is for LOCAL DEV ONLY. In production, poll-stats runs
 * on its cron schedule. Do NOT expose this publicly without auth.
 */
import { handler as pollStats } from './poll-stats.js'

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

  return pollStats()
}
