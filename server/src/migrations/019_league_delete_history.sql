ALTER TABLE league_fixtures
  ADD COLUMN IF NOT EXISTS home_house_name TEXT,
  ADD COLUMN IF NOT EXISTS away_house_name TEXT;

UPDATE league_fixtures f
SET home_house_name = COALESCE(f.home_house_name, (SELECT home.name FROM league_houses home WHERE home.id = f.home_house_id)),
    away_house_name = COALESCE(f.away_house_name, (SELECT away.name FROM league_houses away WHERE away.id = f.away_house_id))
WHERE f.home_house_name IS NULL OR f.away_house_name IS NULL;

ALTER TABLE league_goals
  ADD COLUMN IF NOT EXISTS player_name TEXT,
  ADD COLUMN IF NOT EXISTS house_name TEXT,
  ADD COLUMN IF NOT EXISTS scoring_house_id UUID;

UPDATE league_goals g
SET player_name = COALESCE(g.player_name, u.full_name),
    house_name = COALESCE(g.house_name, h.name),
    scoring_house_id = COALESCE(g.scoring_house_id, p.house_id)
FROM league_players p
JOIN users u ON u.id = p.user_id
JOIN league_houses h ON h.id = p.house_id
WHERE g.player_id = p.id
  AND (g.player_name IS NULL OR g.house_name IS NULL OR g.scoring_house_id IS NULL);

ALTER TABLE league_fixtures
  ALTER COLUMN home_house_id DROP NOT NULL,
  ALTER COLUMN away_house_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS league_fixtures_home_house_id_fkey,
  DROP CONSTRAINT IF EXISTS league_fixtures_away_house_id_fkey,
  ADD CONSTRAINT league_fixtures_home_house_id_fkey
    FOREIGN KEY (home_house_id) REFERENCES league_houses(id) ON DELETE SET NULL,
  ADD CONSTRAINT league_fixtures_away_house_id_fkey
    FOREIGN KEY (away_house_id) REFERENCES league_houses(id) ON DELETE SET NULL;

ALTER TABLE league_goals
  ALTER COLUMN player_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS league_goals_player_id_fkey,
  ADD CONSTRAINT league_goals_player_id_fkey
    FOREIGN KEY (player_id) REFERENCES league_players(id) ON DELETE SET NULL;
