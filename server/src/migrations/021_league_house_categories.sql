ALTER TABLE league_houses ADD COLUMN IF NOT EXISTS gender TEXT;
UPDATE league_houses h SET gender = CASE
  WHEN EXISTS (SELECT 1 FROM league_players p WHERE p.house_id=h.id AND p.gender='boys')
   AND NOT EXISTS (SELECT 1 FROM league_players p WHERE p.house_id=h.id AND p.gender='girls') THEN 'boys'
  ELSE 'girls' END WHERE gender IS NULL;
ALTER TABLE league_houses ALTER COLUMN gender SET NOT NULL,
  ADD CONSTRAINT league_houses_gender_check CHECK (gender IN ('girls','boys'));
CREATE UNIQUE INDEX IF NOT EXISTS league_houses_name_gender_unique ON league_houses (LOWER(name), gender);
