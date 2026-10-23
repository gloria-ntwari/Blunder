-- ============================================================
-- Migration 002: New roles system
-- Run this once against the live database
-- ============================================================

-- Add new role values to the enum (IF NOT EXISTS prevents duplicate errors)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sv_committee';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'teacher';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'student_leader';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'committee';

-- Note: Postgres does not support removing enum values in-place.
-- Old values 'admin' and 'school_leader' are kept in the type but
-- no new users will be created with those roles.
-- Existing admin/school_leader users should be re-assigned manually.
