ALTER TABLE taxi_ride_requests
  ADD COLUMN IF NOT EXISTS seats_requested INTEGER NOT NULL DEFAULT 1 CHECK (seats_requested > 0);
