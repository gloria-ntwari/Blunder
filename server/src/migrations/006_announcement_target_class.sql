-- Keep announcement filtering compatible with the controller and deployed databases.
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS target_class VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_ann_target_class
  ON announcements(target_class);
