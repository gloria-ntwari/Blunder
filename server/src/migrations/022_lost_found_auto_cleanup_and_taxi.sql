CREATE INDEX IF NOT EXISTS idx_lost_found_resolved_cleanup
  ON lost_found (claimed_at) WHERE is_claimed = TRUE;

CREATE TABLE IF NOT EXISTS taxi_rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ride_type TEXT NOT NULL CHECK (ride_type IN ('offer', 'join')),
  departure TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_at TIMESTAMPTZ,
  notes TEXT,
  total_seats INTEGER NOT NULL CHECK (total_seats > 0),
  available_seats INTEGER NOT NULL CHECK (available_seats >= 0 AND available_seats <= total_seats),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'full', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS taxi_ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES taxi_rides(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seats_requested INTEGER NOT NULL DEFAULT 1 CHECK (seats_requested > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ride_id, requester_id)
);

CREATE INDEX IF NOT EXISTS idx_taxi_rides_board ON taxi_rides (status, departure_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_taxi_requests_ride ON taxi_ride_requests (ride_id, status);

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
