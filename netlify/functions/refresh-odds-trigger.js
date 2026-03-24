/**
 * HTTP wrapper for manually triggering refresh-odds.
 * Useful for testing and one-off manual refreshes.
 *
 * Usage:
 *   curl https://your-site.netlify.app/.netlify/functions/refresh-odds-trigger
 *
 * With secret (set POLL_TRIGGER_SECRET env var):
 *   curl -H "x-trigger-secret: <secret>" https://.../.netlify/functions/refresh-odds-trigger
 */
import { handler as refreshOdds } from './refresh-odds.js'

export async function handler(event) {
  const authHeader  = event.headers?.['x-trigger-secret'] ?? ''
  const secret      = process.env.POLL_TRIGGER_SECRET ?? ''
  const isProduction = process.env.CONTEXT === 'production'

  if (isProduction && !secret) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Set POLL_TRIGGER_SECRET to enable manual trigger in production.' }),
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

  return refreshOdds()
}
