CREATE TABLE IF NOT EXISTS taxi_seat_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  departure TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_at TIMESTAMPTZ,
  seats_needed INTEGER NOT NULL CHECK (seats_needed > 0 AND seats_needed <= 20),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS taxi_seat_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_request_id UUID NOT NULL REFERENCES taxi_seat_requests(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  seats_offered INTEGER NOT NULL DEFAULT 1 CHECK (seats_offered > 0 AND seats_offered <= 20),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (seat_request_id, driver_id)
);
CREATE INDEX IF NOT EXISTS idx_taxi_seat_requests_board ON taxi_seat_requests (status, departure_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_taxi_seat_offers_request ON taxi_seat_offers (seat_request_id, status);
