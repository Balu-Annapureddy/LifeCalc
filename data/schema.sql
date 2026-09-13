-- LifeCalc Production Postgres / Supabase Schema
-- Includes atomic guest quotas, users, sessions, rate limits, history, and saved scenarios.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS guest_quotas (
  guest_id TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  last_used BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  lock_until BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  calculator_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  primary_value TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  inputs JSONB NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS saved_scenarios (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  calculator_id TEXT NOT NULL,
  name TEXT NOT NULL,
  primary_result TEXT NOT NULL,
  notes TEXT,
  updated_at TEXT NOT NULL,
  inputs JSONB NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS shared_calculations (
  id TEXT PRIMARY KEY,
  calculator_id TEXT NOT NULL,
  inputs JSONB NOT NULL,
  created_at BIGINT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_scenarios ENABLE ROW LEVEL SECURITY;