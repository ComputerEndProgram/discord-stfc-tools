-- DM assistant sessions + roster query role gates + optional AI flag
CREATE TABLE IF NOT EXISTS dm_sessions (
	discord_user_id TEXT PRIMARY KEY,
	guild_id TEXT,
	flow TEXT NOT NULL,
	step TEXT NOT NULL DEFAULT 'start',
	payload_json TEXT DEFAULT '{}',
	updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dm_sessions_updated ON dm_sessions (updated_at);

ALTER TABLE guild_configs ADD COLUMN dm_query_role_ids TEXT DEFAULT '[]';
ALTER TABLE guild_configs ADD COLUMN dm_ai_enabled INTEGER DEFAULT 0;

-- Daily Workers AI request counter (hard-cap free tier usage)
CREATE TABLE IF NOT EXISTS dm_ai_usage (
	day TEXT PRIMARY KEY,
	request_count INTEGER NOT NULL DEFAULT 0
);
