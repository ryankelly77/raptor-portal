-- Raptor Installation Progress Tracker Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to generate random URL-safe tokens
CREATE OR REPLACE FUNCTION generate_public_token(length int DEFAULT 12)
RETURNS text AS $$
DECLARE
  chars text := 'abcdefghjkmnpqrstuvwxyz23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CORE TABLES
-- ============================================

-- Property Managers (the people who manage buildings)
CREATE TABLE property_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token VARCHAR(20) UNIQUE DEFAULT generate_public_token(16),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  company VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Properties (the buildings)
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_manager_id UUID REFERENCES property_managers(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100),
  state VARCHAR(50),
  zip VARCHAR(20),
  total_employees INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations (specific spots within a building - floors, break rooms, etc.)
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  floor VARCHAR(50),
  description TEXT,
  employee_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects (installations at a specific location)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_token VARCHAR(20) UNIQUE DEFAULT generate_public_token(12),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  project_number VARCHAR(20) NOT NULL,
  configuration TEXT,
  raptor_pm_name VARCHAR(100),
  raptor_pm_email VARCHAR(255),
  raptor_pm_phone VARCHAR(20),
  estimated_completion DATE,
  overall_progress INT DEFAULT 0 CHECK (overall_progress >= 0 AND overall_progress <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phases
CREATE TABLE phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
  start_date VARCHAR(50),
  end_date VARCHAR(50),
  description TEXT,
  is_approximate BOOLEAN DEFAULT false,
  property_responsibility BOOLEAN DEFAULT false,
  contractor_name VARCHAR(255),
  contractor_scheduled_date VARCHAR(100),
  contractor_status VARCHAR(100),
  survey_response_rate VARCHAR(20),
  survey_top_meals JSONB DEFAULT '[]'::jsonb,
  survey_top_snacks JSONB DEFAULT '[]'::jsonb,
  survey_dietary_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, phase_number)
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  scheduled_date DATE,
  upload_speed VARCHAR(50),
  download_speed VARCHAR(50),
  enclosure_type VARCHAR(50),
  enclosure_color VARCHAR(50),
  custom_color_name VARCHAR(100),
  smartfridge_qty INT,
  smartcooker_qty INT,
  delivery_carrier VARCHAR(100),
  tracking_number VARCHAR(100),
  deliveries JSONB,
  document_url TEXT,
  pm_text_value TEXT,
  pm_text_response TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  model VARCHAR(255),
  spec VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'fabricating', 'ready', 'in-transit', 'delivered', 'installed')),
  status_label VARCHAR(100),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_property_managers_token ON property_managers(access_token);
CREATE INDEX idx_properties_manager ON properties(property_manager_id);
CREATE INDEX idx_locations_property ON locations(property_id);
CREATE INDEX idx_projects_public_token ON projects(public_token);
CREATE INDEX idx_projects_location ON projects(location_id);
CREATE INDEX idx_projects_is_active ON projects(is_active);
CREATE INDEX idx_phases_project_id ON phases(project_id);
CREATE INDEX idx_phases_status ON phases(status);
CREATE INDEX idx_tasks_phase_id ON tasks(phase_id);
CREATE INDEX idx_equipment_project_id ON equipment(project_id);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER property_managers_updated_at BEFORE UPDATE ON property_managers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER locations_updated_at BEFORE UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER phases_updated_at BEFORE UPDATE ON phases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER equipment_updated_at BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE property_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read property_managers" ON property_managers FOR SELECT USING (true);
CREATE POLICY "Public read properties" ON properties FOR SELECT USING (true);
CREATE POLICY "Public read locations" ON locations FOR SELECT USING (true);
CREATE POLICY "Public read projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Public read phases" ON phases FOR SELECT USING (true);
CREATE POLICY "Public read tasks" ON tasks FOR SELECT USING (true);
CREATE POLICY "Public read equipment" ON equipment FOR SELECT USING (true);

-- Anon write policies (for admin area - use proper auth in production)
CREATE POLICY "Anon write property_managers" ON property_managers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon write properties" ON properties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon write locations" ON locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon write projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon write phases" ON phases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon write tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon write equipment" ON equipment FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SAMPLE DATA
-- ============================================
DO $$
DECLARE
  pm_id UUID;
  prop_id UUID;
  loc_id UUID;
  proj_id UUID;
  phase1_id UUID;
  phase2_id UUID;
  phase3_id UUID;
  phase4_id UUID;
  phase5_id UUID;
BEGIN
  -- Create property manager
  INSERT INTO property_managers (name, email, company)
  VALUES ('John Martinez', 'john@landmarkproperties.com', 'Landmark Property Management')
  RETURNING id INTO pm_id;

  -- Create property (building)
  INSERT INTO properties (property_manager_id, name, address, city, state, zip, total_employees)
  VALUES (pm_id, 'Landmark One', '15727 Anthem Pkwy', 'San Antonio', 'TX', '78249', 450)
  RETURNING id INTO prop_id;

  -- Create location (specific area within building)
  INSERT INTO locations (property_id, name, floor, description, employee_count)
  VALUES (prop_id, '4th Floor Break Room', '4', 'Main break room serving floors 3-5', 150)
  RETURNING id INTO loc_id;

  -- Create project
  INSERT INTO projects (
    location_id, project_number, configuration,
    raptor_pm_name, raptor_pm_email, raptor_pm_phone,
    estimated_completion, overall_progress
  ) VALUES (
    loc_id,
    'RV-2025-0147',
    '2× Smart Fridge™ + 1× Smart Cooker™',
    'Ryan Kelly',
    'ryan@raptor-vending.com',
    '(385) 438-6325',
    '2025-02-07',
    45
  ) RETURNING id INTO proj_id;

  -- Insert phases
  INSERT INTO phases (project_id, phase_number, title, status, start_date, end_date, description)
  VALUES (proj_id, 1, 'Site Assessment & Planning', 'completed', 'Jan 6, 2025', 'Jan 10, 2025',
    'Site survey completed. Optimal placement identified in 4th floor break room. Cellular signal strength verified for reliable transaction processing. Space requirements confirmed.')
  RETURNING id INTO phase1_id;

  INSERT INTO phases (project_id, phase_number, title, status, start_date, end_date, description, survey_response_rate, survey_top_meals, survey_top_snacks, survey_dietary_notes)
  VALUES (proj_id, 2, 'Employee Preference Survey', 'completed', 'Jan 10, 2025', 'Jan 17, 2025',
    'Survey distributed to building employees to capture snack and meal preferences. Results compiled and menu customization planned based on employee favorites.',
    '42%', '["Butter Chicken", "Buffalo Mac & Cheese", "Chicken Tikka Masala"]'::jsonb,
    '["Fresh Fruit Cups", "RXBARs", "Hummus & Pretzel Packs"]'::jsonb, '12% vegetarian options requested')
  RETURNING id INTO phase2_id;

  INSERT INTO phases (project_id, phase_number, title, status, start_date, end_date, description, property_responsibility, contractor_name, contractor_scheduled_date, contractor_status)
  VALUES (proj_id, 3, 'Electrical Preparation', 'in-progress', 'Jan 13, 2025', 'Jan 24, 2025',
    'Property is responsible for electrical preparation. Dedicated 15A circuit required for Smart Cooker™ induction system. We''ve provided specifications—property team is coordinating contractor quotes and installation.',
    true, 'Select Electric LLC', 'Jan 20-22, 2025', 'Scheduled')
  RETURNING id INTO phase3_id;

  INSERT INTO phases (project_id, phase_number, title, status, start_date, end_date, description, is_approximate)
  VALUES (proj_id, 4, 'System Installation & Integration', 'pending', '~Jan 27, 2025', '~Jan 31, 2025',
    'Equipment delivery and installation. Smart Fridge™ units positioned and connected. Smart Cooker™ integrated with dedicated circuit. Payment system activation and cellular connectivity confirmed.',
    true)
  RETURNING id INTO phase4_id;

  INSERT INTO phases (project_id, phase_number, title, status, start_date, end_date, description, is_approximate)
  VALUES (proj_id, 5, 'Testing, Stocking & Launch', 'pending', '~Feb 3, 2025', '~Feb 7, 2025',
    'Full system testing, initial inventory stocking with Southerleigh chef-prepared meals based on survey results, property management dashboard setup, and tenant launch communications.',
    true)
  RETURNING id INTO phase5_id;

  -- Insert tasks for all phases
  INSERT INTO tasks (phase_id, label, completed, sort_order) VALUES
    (phase1_id, 'Initial site survey and measurements', true, 1),
    (phase1_id, 'Optimal placement location identified', true, 2),
    (phase1_id, 'Cellular signal strength verification', true, 3),
    (phase1_id, 'Space and traffic flow assessment', true, 4),
    (phase1_id, 'Infrastructure specifications delivered to property', true, 5);

  INSERT INTO tasks (phase_id, label, completed, sort_order) VALUES
    (phase2_id, 'Survey link distributed to property management', true, 1),
    (phase2_id, 'Employee participation (target: 30%+ response rate)', true, 2),
    (phase2_id, 'Snack preferences compiled', true, 3),
    (phase2_id, 'Hot meal preferences compiled', true, 4),
    (phase2_id, 'Custom menu recommendations finalized', true, 5);

  INSERT INTO tasks (phase_id, label, completed, sort_order) VALUES
    (phase3_id, 'Electrical specifications provided to property', true, 1),
    (phase3_id, 'Property obtained contractor quotes', true, 2),
    (phase3_id, 'Property selected electrical contractor', true, 3),
    (phase3_id, 'Dedicated 15A circuit installation', false, 4),
    (phase3_id, 'Electrical inspection passed', false, 5);

  INSERT INTO tasks (phase_id, label, completed, sort_order) VALUES
    (phase4_id, 'Equipment delivery to site', false, 1),
    (phase4_id, 'Smart Fridge™ units positioning', false, 2),
    (phase4_id, 'Smart Cooker™ installation & circuit connection', false, 3),
    (phase4_id, 'Custom enclosure installation', false, 4),
    (phase4_id, 'Payment system activation', false, 5),
    (phase4_id, 'Cellular transaction testing', false, 6);

  INSERT INTO tasks (phase_id, label, completed, sort_order) VALUES
    (phase5_id, 'AI vision system calibration', false, 1),
    (phase5_id, 'Payment processing verification', false, 2),
    (phase5_id, 'Initial Southerleigh meal inventory (survey-based)', false, 3),
    (phase5_id, 'Snack inventory based on employee preferences', false, 4),
    (phase5_id, 'Property management dashboard access', false, 5),
    (phase5_id, 'Tenant communication materials delivered', false, 6),
    (phase5_id, 'Official infrastructure launch', false, 7);

  -- Insert equipment
  INSERT INTO equipment (project_id, name, model, spec, status, status_label, sort_order) VALUES
    (proj_id, 'Smart Fridge™ Unit A', 'MicroMart SF-200', '60 meal capacity', 'ready', 'Ready for Delivery', 1),
    (proj_id, 'Smart Fridge™ Unit B', 'MicroMart SF-200', '60 meal capacity', 'ready', 'Ready for Delivery', 2),
    (proj_id, 'Smart Cooker™ System', 'KitchenMate SC-3P', '3-pod induction heating', 'ready', 'Ready for Delivery', 3),
    (proj_id, 'Custom Wood Enclosure', 'FixtureLite', 'Walnut finish, building-matched', 'fabricating', 'Fabrication in Progress', 4);

END $$;

-- ============================================
-- VIEW TOKENS FOR TESTING
-- ============================================
SELECT
  pm.name as property_manager,
  pm.access_token as pm_token,
  pm.company,
  prop.name as building,
  loc.name as location,
  loc.floor,
  proj.project_number,
  proj.public_token as project_token,
  proj.overall_progress
FROM property_managers pm
JOIN properties prop ON prop.property_manager_id = pm.id
JOIN locations loc ON loc.property_id = prop.id
JOIN projects proj ON proj.location_id = loc.id;

-- ============================================
-- URL STRUCTURE
-- ============================================
-- Single project view:     /project/{project_token}
-- Property manager portal: /pm/{pm_access_token}
--   (shows all their properties → locations → projects)
