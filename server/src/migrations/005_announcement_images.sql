-- Migration 005: allow announcements to include an uploaded image
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_url TEXT;
