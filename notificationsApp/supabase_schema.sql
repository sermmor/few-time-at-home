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

-- ============================================================
-- Weather forecast (updated daily at 07:00 by the backend)
-- Single-row table: id is always 1. The backend upserts it.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.weather (
  id               INTEGER     PRIMARY KEY DEFAULT 1,
  date_str         TEXT        NOT NULL DEFAULT '',
  sky_morning      TEXT        NOT NULL DEFAULT '',
  sky_afternoon    TEXT        NOT NULL DEFAULT '',
  sky_night        TEXT        NOT NULL DEFAULT '',
  temp_min         INTEGER,
  temp_max         INTEGER,
  rain_probability INTEGER     NOT NULL DEFAULT 0,
  rain_periods     JSONB       NOT NULL DEFAULT '[]',
  will_rain        BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL    ON TABLE public.weather TO service_role;
GRANT SELECT ON TABLE public.weather TO anon;
GRANT SELECT ON TABLE public.weather TO authenticated;

ALTER TABLE public.weather ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_weather" ON public.weather FOR SELECT USING (true);

-- Enable Realtime so the Flutter app gets instant updates when the
-- backend upserts the daily forecast.
ALTER PUBLICATION supabase_realtime ADD TABLE public.weather;
