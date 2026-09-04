-- A display name the user sets themselves in 个人设置. Kept separate from the
-- OAuth-provided `name` so signing in again never overwrites what they typed.
ALTER TABLE users ADD COLUMN display_name TEXT;
