CREATE TABLE IF NOT EXISTS announcement_tracks (
  announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  academic_track academic_track NOT NULL,
  PRIMARY KEY (announcement_id, academic_track)
);

INSERT INTO announcement_tracks (announcement_id, academic_track)
SELECT id, target_track
FROM announcements
WHERE scope = 'academic_track' AND target_track IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_announcement_tracks_track
  ON announcement_tracks(academic_track, announcement_id);
