-- Global cross-user transcript cache: any video translated once by any user
-- becomes instantly available (with Chinese) to every other device/user.
CREATE TABLE IF NOT EXISTS shared_transcripts (
  video_id TEXT PRIMARY KEY,
  sentences_json TEXT NOT NULL,
  sentence_count INTEGER NOT NULL DEFAULT 0,
  has_translation INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
