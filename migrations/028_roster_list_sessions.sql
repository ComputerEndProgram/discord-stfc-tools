-- Short-lived sessions for /roster list Prev/Next and Table/List buttons.

CREATE TABLE IF NOT EXISTS roster_list_sessions (
	token TEXT PRIMARY KEY,
	guild_id TEXT NOT NULL,
	user_id TEXT NOT NULL,
	payload TEXT NOT NULL,
	expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_roster_list_sessions_expires
	ON roster_list_sessions (expires_at);
