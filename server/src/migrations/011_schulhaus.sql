ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'dj_team';

CREATE TABLE IF NOT EXISTS schulhaus_dress_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(160) NOT NULL,
  details TEXT,
  wear_date DATE,
  image_url TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schulhaus_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  artist VARCHAR(200),
  link TEXT,
  in_playlist BOOLEAN NOT NULL DEFAULT FALSE,
  added_to_playlist_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS schulhaus_songs_title_unique
  ON schulhaus_songs (LOWER(TRIM(title)));

CREATE TABLE IF NOT EXISTS schulhaus_song_suggestions (
  song_id UUID NOT NULL REFERENCES schulhaus_songs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (song_id, user_id)
);

CREATE TABLE IF NOT EXISTS schulhaus_song_votes (
  song_id UUID NOT NULL REFERENCES schulhaus_songs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (song_id, user_id)
);

CREATE TABLE IF NOT EXISTS schulhaus_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS schulhaus_dress_codes_date_idx
  ON schulhaus_dress_codes(wear_date, created_at DESC);
CREATE INDEX IF NOT EXISTS schulhaus_songs_playlist_idx
  ON schulhaus_songs(in_playlist, created_at DESC);
CREATE INDEX IF NOT EXISTS schulhaus_announcements_created_idx
  ON schulhaus_announcements(created_at DESC);
