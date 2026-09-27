-- ==============================================================================
-- MIGRACIÓN SUPABASE: ESQUEMA AISLADO mia_iatrading (BY TONI)
-- ==============================================================================

CREATE SCHEMA IF NOT EXISTS mia_iatrading;
GRANT USAGE ON SCHEMA mia_iatrading TO anon, authenticated, service_role, authenticator;
GRANT ALL ON ALL TABLES IN SCHEMA mia_iatrading TO anon, authenticated, service_role, authenticator;
GRANT ALL ON ALL SEQUENCES IN SCHEMA mia_iatrading TO anon, authenticated, service_role, authenticator;
ALTER DEFAULT PRIVILEGES IN SCHEMA mia_iatrading GRANT ALL ON TABLES TO anon, authenticated, service_role, authenticator;

CREATE TABLE IF NOT EXISTS mia_iatrading.models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  strategy_type TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  status TEXT DEFAULT 'training',
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE mia_iatrading.models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for models" ON mia_iatrading.models;
CREATE POLICY "Allow all for models" ON mia_iatrading.models FOR ALL USING (true) WITH CHECK (true);
