-- Support GitHub as a second login provider (alongside Google) and let each
-- user store their own AI provider API keys server-side.

-- IMPORTANT: bookshelf_items.user_id is a FK to users(id) with ON DELETE CASCADE.
-- Dropping `users` fires that cascade and wipes every bookshelf row, and
-- `PRAGMA defer_foreign_keys` does NOT prevent it (it only defers constraint
-- *checking*, not the cascade action). So park the child rows in a temp table
-- for the duration of the rebuild and put them back afterwards.
CREATE TABLE bookshelf_items_backup AS SELECT * FROM bookshelf_items;

-- SQLite can't relax a NOT NULL/UNIQUE constraint in place, so rebuild `users`
-- with google_sub made nullable and a new nullable github_id added.
CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_sub TEXT UNIQUE,
  github_id TEXT UNIQUE,
  github_login TEXT,
  email TEXT,
  name TEXT,
  picture TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT INTO users_new (id, google_sub, email, name, picture, created_at, updated_at)
  SELECT id, google_sub, email, name, picture, created_at, updated_at FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- Restore any bookshelf rows the cascade removed during the swap.
INSERT OR IGNORE INTO bookshelf_items SELECT * FROM bookshelf_items_backup;
DROP TABLE bookshelf_items_backup;

-- One row per (user, AI provider). api_key is stored AES-GCM encrypted
-- (base64, iv-prefixed) — never in plaintext.
CREATE TABLE IF NOT EXISTS user_api_keys (
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  base_url TEXT,
  model TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, provider),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
