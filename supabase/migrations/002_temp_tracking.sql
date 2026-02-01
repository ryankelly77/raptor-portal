-- ============================================
-- FOOD TEMPERATURE TRACKING TABLES
-- Migration: 002_temp_tracking.sql
-- ============================================

-- Drivers table (for driver authentication and management)
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token VARCHAR(20) UNIQUE DEFAULT substr(md5(random()::text), 1, 16),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Temperature log sessions (a delivery run from pickup to all stops)
CREATE TABLE IF NOT EXISTS temp_log_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vehicle_id VARCHAR(50),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual temperature log entries (each stop)
CREATE TABLE IF NOT EXISTS temp_log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES temp_log_sessions(id) ON DELETE CASCADE,
  entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('pickup', 'delivery')),
  stop_number INT NOT NULL DEFAULT 1,
  location_name VARCHAR(255),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  temperature DECIMAL(5,1) NOT NULL,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_drivers_token ON drivers(access_token);
CREATE INDEX IF NOT EXISTS idx_drivers_active ON drivers(is_active);
CREATE INDEX IF NOT EXISTS idx_temp_log_sessions_driver ON temp_log_sessions(driver_id);
CREATE INDEX IF NOT EXISTS idx_temp_log_sessions_date ON temp_log_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_temp_log_sessions_status ON temp_log_sessions(status);
CREATE INDEX IF NOT EXISTS idx_temp_log_entries_session ON temp_log_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_temp_log_entries_type ON temp_log_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_temp_log_entries_timestamp ON temp_log_entries(timestamp);

-- ============================================
-- TRIGGERS (auto-update updated_at)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS drivers_updated_at ON drivers;
CREATE TRIGGER drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS temp_log_sessions_updated_at ON temp_log_sessions;
CREATE TRIGGER temp_log_sessions_updated_at
  BEFORE UPDATE ON temp_log_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS temp_log_entries_updated_at ON temp_log_entries;
CREATE TRIGGER temp_log_entries_updated_at
  BEFORE UPDATE ON temp_log_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_log_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_log_entries ENABLE ROW LEVEL SECURITY;

-- Public read policies (for admin viewing)
DROP POLICY IF EXISTS "Public read drivers" ON drivers;
CREATE POLICY "Public read drivers" ON drivers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read temp_log_sessions" ON temp_log_sessions;
CREATE POLICY "Public read temp_log_sessions" ON temp_log_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read temp_log_entries" ON temp_log_entries;
CREATE POLICY "Public read temp_log_entries" ON temp_log_entries FOR SELECT USING (true);

-- Anon write policies (controlled via API auth)
DROP POLICY IF EXISTS "Anon write drivers" ON drivers;
CREATE POLICY "Anon write drivers" ON drivers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon write temp_log_sessions" ON temp_log_sessions;
CREATE POLICY "Anon write temp_log_sessions" ON temp_log_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon write temp_log_entries" ON temp_log_entries;
CREATE POLICY "Anon write temp_log_entries" ON temp_log_entries FOR ALL USING (true) WITH CHECK (true);
