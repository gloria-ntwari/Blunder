CREATE TABLE IF NOT EXISTS schulhaus_dress_code_reactions (
  dress_code_id UUID NOT NULL REFERENCES schulhaus_dress_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (dress_code_id, user_id, reaction)
);

CREATE TABLE IF NOT EXISTS schulhaus_dress_code_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dress_code_id UUID NOT NULL REFERENCES schulhaus_dress_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  body VARCHAR(300) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS schulhaus_dress_code_comments_idx
  ON schulhaus_dress_code_comments(dress_code_id, created_at ASC);
