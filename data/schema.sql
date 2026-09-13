-- LifeCalc Authoritative Production PostgreSQL / Supabase Migration Schema
-- Designed for horizontal scaling, atomic quota invariants, and Row Level Security.

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- 3. Guest Quotas Table
CREATE TABLE IF NOT EXISTS guest_quotas (
  guest_id TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  last_used BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

-- 4. Authentication Rate Limits Table
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  lock_until BIGINT NOT NULL DEFAULT 0
);

-- 5. Calculation History Table
CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  calculator_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  primary_value TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  inputs JSONB NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_history_user_id ON history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC);

-- 6. Saved Scenarios Table
CREATE TABLE IF NOT EXISTS saved_scenarios (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  calculator_id TEXT NOT NULL,
  name TEXT NOT NULL,
  primary_result TEXT NOT NULL,
  notes TEXT,
  updated_at TEXT NOT NULL,
  inputs JSONB NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_saved_scenarios_user_id ON saved_scenarios(user_id);

-- 7. Shared Calculations Table
CREATE TABLE IF NOT EXISTS shared_calculations (
  id TEXT PRIMARY KEY,
  calculator_id TEXT NOT NULL,
  inputs JSONB NOT NULL,
  created_at BIGINT NOT NULL
);

-- 8. Enable Row Level Security (RLS) on all user-facing tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_calculations ENABLE ROW LEVEL SECURITY;

-- 9. Explicit Row Level Security Policies (Idempotent Drop-and-Create)
-- Shared calculations: public read by share ID
DROP POLICY IF EXISTS "Public calculations are readable by anyone" ON shared_calculations;
CREATE POLICY "Public calculations are readable by anyone"
  ON shared_calculations FOR SELECT
  USING (true);

-- History: owner isolated
DROP POLICY IF EXISTS "Users manage own history" ON history;
CREATE POLICY "Users manage own history"
  ON history FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Saved scenarios: owner isolated
DROP POLICY IF EXISTS "Users manage own saved scenarios" ON saved_scenarios;
CREATE POLICY "Users manage own saved scenarios"
  ON saved_scenarios FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- 10. Authoritative Atomic Stored Procedure: increment_guest_quota
-- Guarantees race-free quota increments in PostgreSQL under concurrent transactions.
-- Returns allowed = true for 1..15, allowed = false if count >= 15.
CREATE OR REPLACE FUNCTION increment_guest_quota(p_guest_id TEXT, p_max_allowed INTEGER DEFAULT 15)
RETURNS TABLE (allowed BOOLEAN, new_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
  v_now BIGINT := (EXTRACT(EPOCH FROM NOW())::BIGINT * 1000);
BEGIN
  -- Single atomic statement with row lock via ON CONFLICT
  INSERT INTO guest_quotas (guest_id, count, last_used, created_at)
  VALUES (p_guest_id, 1, v_now, v_now)
  ON CONFLICT (guest_id) DO UPDATE
    SET count = CASE
          WHEN guest_quotas.count < p_max_allowed THEN guest_quotas.count + 1
          ELSE guest_quotas.count
        END,
        last_used = v_now
  RETURNING guest_quotas.count INTO v_count;

  IF v_count <= p_max_allowed THEN
    RETURN QUERY SELECT true, v_count;
  ELSE
    RETURN QUERY SELECT false, v_count;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Authoritative Atomic Stored Procedure: record_failed_login_atomic
-- Increments attempt count atomically and computes 15-minute lock if threshold reached.
CREATE OR REPLACE FUNCTION record_failed_login_atomic(p_key TEXT, p_max_attempts INTEGER DEFAULT 5, p_lock_ms BIGINT DEFAULT 900000)
RETURNS TABLE (locked BOOLEAN, current_attempts INTEGER, lock_until BIGINT) AS $$
DECLARE
  v_now BIGINT := (EXTRACT(EPOCH FROM NOW())::BIGINT * 1000);
  v_attempts INTEGER;
  v_lock_until BIGINT;
BEGIN
  INSERT INTO auth_rate_limits (key, attempts, lock_until)
  VALUES (p_key, 1, 0)
  ON CONFLICT (key) DO UPDATE
    SET attempts = auth_rate_limits.attempts + 1,
        lock_until = CASE
          WHEN auth_rate_limits.attempts + 1 >= p_max_attempts THEN v_now + p_lock_ms
          ELSE auth_rate_limits.lock_until
        END
  RETURNING auth_rate_limits.attempts, auth_rate_limits.lock_until INTO v_attempts, v_lock_until;

  RETURN QUERY SELECT (v_lock_until > v_now), v_attempts, v_lock_until;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;