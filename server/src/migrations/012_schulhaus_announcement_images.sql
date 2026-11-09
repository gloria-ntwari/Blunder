ALTER TABLE schulhaus_announcements ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE TABLE IF NOT EXISTS schulhaus_dress_code_votes (
  dress_code_id UUID NOT NULL REFERENCES schulhaus_dress_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer VARCHAR(6) NOT NULL CHECK (answer IN ('accept', 'reject')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (dress_code_id, user_id)
);
