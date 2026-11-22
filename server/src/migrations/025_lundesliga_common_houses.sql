-- Houses are shared across boys' and girls' competitions. Keep the legacy column
-- only for compatibility with existing deployments; new houses get a harmless default.
ALTER TABLE league_houses ALTER COLUMN gender SET DEFAULT 'girls';
