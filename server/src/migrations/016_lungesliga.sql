CREATE TABLE IF NOT EXISTS league_houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  leader_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS league_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id UUID NOT NULL REFERENCES league_houses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  gender TEXT NOT NULL CHECK (gender IN ('girls', 'boys')),
  added_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (house_id, user_id)
);

CREATE TABLE IF NOT EXISTS league_fixtures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_house_id UUID NOT NULL REFERENCES league_houses(id) ON DELETE RESTRICT,
  away_house_id UUID NOT NULL REFERENCES league_houses(id) ON DELETE RESTRICT,
  gender TEXT NOT NULL CHECK (gender IN ('girls', 'boys')),
  match_date TIMESTAMPTZ,
  venue TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (home_house_id <> away_house_id)
);

CREATE TABLE IF NOT EXISTS league_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id UUID NOT NULL REFERENCES league_fixtures(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES league_players(id) ON DELETE RESTRICT,
  scored_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_league_players_house ON league_players(house_id);
CREATE INDEX IF NOT EXISTS idx_league_goals_fixture ON league_goals(fixture_id);
