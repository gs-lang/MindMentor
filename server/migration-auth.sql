-- MindMentor Auth + Billing Migration
-- Run once against the existing PostgreSQL database

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'team', 'business')),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);

-- Session table for connect-pg-simple
CREATE TABLE IF NOT EXISTS "session" (
  "sid" VARCHAR NOT NULL COLLATE "default",
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Usage tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  question_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_tracking(user_id, usage_date);

-- Team seats table (Team + Business tiers)
-- Team tier: up to 5 seats. Business tier: up to 10 seats.
CREATE TABLE IF NOT EXISTS team_seats (
  id SERIAL PRIMARY KEY,
  owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  invite_email VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_seats_owner ON team_seats(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_team_seats_member ON team_seats(member_user_id);

-- If users table already exists with the old CHECK constraint, alter it to add 'team'
-- (safe to run multiple times — ALTER TABLE ADD CONSTRAINT fails silently if already exists)
DO $$
BEGIN
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_subscription_tier_check;
  ALTER TABLE users ADD CONSTRAINT users_subscription_tier_check
    CHECK (subscription_tier IN ('free', 'pro', 'team', 'business'));
EXCEPTION WHEN others THEN
  NULL; -- ignore if constraint manipulation fails (table may not exist yet)
END $$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_seats_updated_at ON team_seats;
CREATE TRIGGER update_team_seats_updated_at
  BEFORE UPDATE ON team_seats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
