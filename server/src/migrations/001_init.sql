-- ============================================================
-- B-LUNDER DATABASE MIGRATION v1
-- ============================================================

-- ENUM TYPES
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'mentor', 'student');
CREATE TYPE admin_type AS ENUM ('school_admin', 'school_leader');
CREATE TYPE academic_track AS ENUM ('IB', 'MINT', 'Abitur');
CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
CREATE TYPE announcement_scope AS ENUM ('school_wide', 'house', 'mentor_group', 'academic_track');
CREATE TYPE event_scope AS ENUM ('school', 'academic', 'house', 'mentor_group');
CREATE TYPE deadline_type AS ENUM ('academic', 'personal');
CREATE TYPE entity_type AS ENUM ('lost_found', 'announcement', 'event');

-- ============================================================
-- HOUSES (scaffolded, populated in future release)
-- ============================================================
CREATE TABLE IF NOT EXISTS houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  role user_role NOT NULL DEFAULT 'student',
  admin_type admin_type,               -- only set when role = admin
  academic_track academic_track,       -- for school_leader, mentor, student
  class_year VARCHAR(20),              -- e.g. 'DP2', 'Klasse 10', 'Q1'
  house_id UUID REFERENCES houses(id) ON DELETE SET NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_track ON users(academic_track);

-- ============================================================
-- MENTOR GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS mentor_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  academic_track academic_track,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from users to mentor_groups for students
ALTER TABLE users ADD COLUMN IF NOT EXISTS mentor_group_id UUID REFERENCES mentor_groups(id) ON DELETE SET NULL;

-- ============================================================
-- OTPs (for invite flow + password reset)
-- ============================================================
CREATE TABLE IF NOT EXISTS otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(10) NOT NULL,
  purpose VARCHAR(50) NOT NULL DEFAULT 'invite', -- 'invite' | 'reset'
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FOOD MENU
-- ============================================================
CREATE TABLE IF NOT EXISTS food_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_date DATE NOT NULL,
  meal_type meal_type NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',    -- [{name, description}]
  image_url TEXT,
  is_special_snack BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (menu_date, meal_type)
);

-- ============================================================
-- SNACK ALERTS (real-time broadcasts)
-- ============================================================
CREATE TABLE IF NOT EXISTS snack_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  scope announcement_scope NOT NULL DEFAULT 'school_wide',
  target_track academic_track,         -- set when scope = academic_track
  target_mentor_group_id UUID REFERENCES mentor_groups(id) ON DELETE SET NULL,
  target_house_id UUID REFERENCES houses(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_urgent BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ann_scope ON announcements(scope);
CREATE INDEX IF NOT EXISTS idx_ann_created ON announcements(created_at DESC);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location VARCHAR(200),
  scope event_scope NOT NULL DEFAULT 'school',
  target_track academic_track,
  target_mentor_group_id UUID REFERENCES mentor_groups(id) ON DELETE SET NULL,
  target_house_id UUID REFERENCES houses(id) ON DELETE SET NULL,
  image_url TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);

-- ============================================================
-- LOST AND FOUND
-- ============================================================
CREATE TABLE IF NOT EXISTS lost_found (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name VARCHAR(200) NOT NULL,
  description TEXT,
  photo_url TEXT,
  location_found VARCHAR(200),
  date_found DATE NOT NULL DEFAULT CURRENT_DATE,
  posted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_claimed BOOLEAN DEFAULT FALSE,
  claimed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMMENTS (polymorphic on entity_type + entity_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);

-- ============================================================
-- DEADLINES
-- ============================================================
CREATE TABLE IF NOT EXISTS deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  type deadline_type NOT NULL DEFAULT 'academic',
  track academic_track,                -- NULL means all tracks
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- for personal deadlines
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deadlines_due ON deadlines(due_date);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,         -- 'announcement', 'snack', 'event', 'lost_found', 'deadline'
  title VARCHAR(200) NOT NULL,
  body TEXT,
  entity_type VARCHAR(50),
  entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, is_read);
