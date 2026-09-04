-- Per-user record of "I ran the AI translation on this video".
--
-- Deliberately an index, not a copy: the bilingual subtitles themselves stay in
-- the global `shared_transcripts` table so one video is only ever translated
-- once site-wide. This table just answers "which videos did *I* translate".
--
-- Only written when the user actually spends tokens translating — picking up a
-- translation someone else already paid for does not count.
CREATE TABLE IF NOT EXISTS user_translations (
  user_id INTEGER NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT NOT NULL DEFAULT '',
  sentence_count INTEGER NOT NULL DEFAULT 0,
  translated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, video_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_translations_user_time
  ON user_translations(user_id, translated_at DESC);
