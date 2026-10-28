-- Allow calendar events to span multiple days without requiring an end date.
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS end_date DATE;

CREATE INDEX IF NOT EXISTS idx_events_end_date
  ON events(end_date);
