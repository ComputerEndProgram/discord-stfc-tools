-- Discord users excluded from verification invites and unverified-member stats
-- (other bots, alt accounts that will never verify, staff test accounts, etc.)
CREATE TABLE IF NOT EXISTS guild_excluded_users (
	guild_id TEXT NOT NULL,
	discord_user_id TEXT NOT NULL,
	reason TEXT,
	excluded_by TEXT,
	excluded_at TEXT DEFAULT (datetime('now')),
	PRIMARY KEY (guild_id, discord_user_id)
);

CREATE INDEX IF NOT EXISTS idx_guild_excluded_users_guild
	ON guild_excluded_users (guild_id);
