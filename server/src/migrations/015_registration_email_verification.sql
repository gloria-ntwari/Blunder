-- Distinguish self-registration email codes from invite and password reset codes.
ALTER TABLE users ALTER COLUMN is_active SET DEFAULT TRUE;

ALTER TABLE otps DROP CONSTRAINT IF EXISTS otps_purpose_check;

-- Existing accounts remain active. Only newly self-registered accounts are
-- created inactive by the registration endpoint until their email is verified.
CREATE INDEX IF NOT EXISTS idx_otps_email_purpose_created
  ON otps (LOWER(email), purpose, created_at DESC);
