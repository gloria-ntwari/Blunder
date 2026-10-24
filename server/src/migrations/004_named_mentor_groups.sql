-- ============================================================
-- Migration 004: Named Mentor Groups
-- Adds name and class_year to mentor_groups, makes mentor_user_id nullable
-- ============================================================

-- Add a custom name column (required going forward)
ALTER TABLE mentor_groups ADD COLUMN IF NOT EXISTS name VARCHAR(150);

-- Add class_year to scope groups to a specific class
ALTER TABLE mentor_groups ADD COLUMN IF NOT EXISTS class_year VARCHAR(20);

-- Allow mentor_groups to exist without an assigned mentor
ALTER TABLE mentor_groups ALTER COLUMN mentor_user_id DROP NOT NULL;

-- Backfill existing groups: name = mentor's full_name + "'s Group"
UPDATE mentor_groups mg
SET name = (SELECT u.full_name || '''s Group' FROM users u WHERE u.id = mg.mentor_user_id)
WHERE mg.name IS NULL AND mg.mentor_user_id IS NOT NULL;

-- For any remaining NULLs, set a fallback
UPDATE mentor_groups SET name = 'Unnamed Group' WHERE name IS NULL;

-- Now make name NOT NULL
ALTER TABLE mentor_groups ALTER COLUMN name SET NOT NULL;
