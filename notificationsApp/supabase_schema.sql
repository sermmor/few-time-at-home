-- ============================================================
-- FEW_TIME@HOME — Supabase schema for the notifications app
-- Run this in: Supabase dashboard → SQL Editor → New query
-- ============================================================

-- 1. Create the alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  message      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_recurring BOOLEAN     DEFAULT FALSE NOT NULL,
  is_read      BOOLEAN     DEFAULT FALSE NOT NULL
);

-- 2. Grant table-level permissions to Supabase API roles
--    (required when "Automatically expose new tables" is disabled)
GRANT ALL ON TABLE public.alerts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.alerts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.alerts TO authenticated;

-- 3. Row Level Security
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Allow the Flutter app (anon key) to read and update alerts
CREATE POLICY "anon_read"   ON public.alerts FOR SELECT USING (true);
CREATE POLICY "anon_update" ON public.alerts FOR UPDATE USING (true);
CREATE POLICY "anon_delete" ON public.alerts FOR DELETE USING (true);
-- Inserts come from the backend using the service_role key,
-- which bypasses RLS entirely — no insert policy needed here.

-- 3. Enable Realtime so the Flutter app receives live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

-- ============================================================
-- Pomodoro configuration (synced from the web frontend)
-- ============================================================

-- Single-row table: id is always 1. The backend upserts this row
-- every time Configuration → Pomodoro is saved in the web app.
CREATE TABLE IF NOT EXISTS public.pomodoro_config (
  id         INTEGER     PRIMARY KEY DEFAULT 1,
  modes      JSONB       NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL    ON TABLE public.pomodoro_config TO service_role;
GRANT SELECT ON TABLE public.pomodoro_config TO anon;
GRANT SELECT ON TABLE public.pomodoro_config TO authenticated;

ALTER TABLE public.pomodoro_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_pomodoro" ON public.pomodoro_config FOR SELECT USING (true);
