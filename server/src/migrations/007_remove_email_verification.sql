-- Email verification is no longer part of account activation.
ALTER TABLE users DROP COLUMN IF EXISTS is_verified;
