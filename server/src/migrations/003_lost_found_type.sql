-- Migration 003: Add post_type to lost_found table
-- Distinguishes between "I found this" (found) and "I lost this" (lost) posts

ALTER TABLE lost_found ADD COLUMN IF NOT EXISTS post_type VARCHAR(10) NOT NULL DEFAULT 'found';
-- Values: 'found' = someone found an item and is reporting it
--         'lost'  = someone lost an item and is looking for it

-- Back-fill existing rows
UPDATE lost_found SET post_type = 'found' WHERE post_type IS NULL;
