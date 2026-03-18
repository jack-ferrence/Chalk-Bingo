# Testing Notes

## Bingo Line Recalculation

`lines_completed` is ONLY recalculated when `mark_squares_for_event()`
runs. If you manually edit card squares in the Supabase dashboard or via
raw SQL UPDATE, `lines_completed` will NOT update.

**To test bingo detection correctly:**

1. Use the poll-stats function with STATS_SOURCE=mock to generate stat
   events that will trigger square marking through the proper pipeline.

2. Or call the RPC directly via Supabase SQL Editor:
```sql
   SELECT mark_squares_for_event(
     'your-game-id',
     '{"player_id": "player_curry", "stat_type": "three_pointer", "value": 3}'::jsonb
   );
```

3. NEVER test bingo by manually setting `marked: true` on squares in
   the cards table — this bypasses the line counting logic entirely.

## Quick Smoke Test

Use this as the basic end-to-end smoke test:

1. Register with email/password.
   The profile should be auto-created by the `handle_new_user()` trigger,
   and the app should land on the lobby.

2. Open two tabs and join the same room in both.
   Both players should appear on the leaderboard.

3. Trigger stat polling locally:
```bash
curl http://localhost:8888/.netlify/functions/poll-stats-trigger
```
   `stat_events` should flow through the normal pipeline and matching
   squares should mark automatically on both clients.

## Testing poll-stats Locally

The `poll-stats` function is a scheduled function and cannot be invoked
directly with `netlify functions:invoke poll-stats`.

**Use the HTTP trigger wrapper instead:**

1. Make sure your `.env.local` or `.env.development` has:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `STATS_SOURCE=mock`

2. Start Netlify dev server:
```bash
netlify dev
```

3. Trigger the poll manually:
```bash
curl http://localhost:8888/.netlify/functions/poll-stats-trigger
```

4. Check the terminal output for the `poll-stats` logs.

If you set `POLL_TRIGGER_SECRET`, send it as the `x-trigger-secret`
header when calling the wrapper.

**Important:** The trigger wrapper is for local dev only. In production,
`poll-stats` runs automatically every minute via its cron schedule.
