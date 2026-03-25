-- 020_odds_cache.sql
-- Simple key/value cache for TheOddsAPI event lists.
-- Accessed only by the service role (sync-games and refresh-odds).
-- TTL enforced in application code (6h for event lists).

CREATE TABLE IF NOT EXISTS public.odds_cache (
  key        TEXT        PRIMARY KEY,
  data       JSONB       NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS — only accessed via service role key in Netlify functions
ALTER TABLE public.odds_cache DISABLE ROW LEVEL SECURITY;
