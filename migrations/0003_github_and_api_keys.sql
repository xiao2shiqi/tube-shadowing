-- Support GitHub as a second login provider (alongside Google) and let each
-- user store their own AI provider API keys server-side.

-- bookshelf_items has a FK to users(id); defer enforcement while we swap the table.
PRAGMA defer_foreign_keys = true;

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
