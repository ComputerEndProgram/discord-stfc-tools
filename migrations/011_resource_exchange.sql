-- Resource exchange: hub or category layout, donors, cross-alliance requests.

ALTER TABLE guild_configs ADD COLUMN exchange_layout TEXT;
ALTER TABLE guild_configs ADD COLUMN exchange_hub_channel_id TEXT;
ALTER TABLE guild_configs ADD COLUMN exchange_category_id TEXT;
ALTER TABLE guild_configs ADD COLUMN exchange_admin_role_ids TEXT DEFAULT '[]';

CREATE TABLE IF NOT EXISTS exchange_resources (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	guild_id TEXT NOT NULL,
	name TEXT NOT NULL,
	slug TEXT NOT NULL,
	donor_role_id TEXT NOT NULL,
	recipient_role_id TEXT NOT NULL,
	channel_id TEXT NOT NULL,
	pinned_message_id TEXT,
	active INTEGER NOT NULL DEFAULT 1,
	created_at TEXT DEFAULT (datetime('now')),
	UNIQUE (guild_id, slug)
);

CREATE TABLE IF NOT EXISTS exchange_donors (
	resource_id INTEGER NOT NULL,
	discord_user_id TEXT NOT NULL,
	registered_at TEXT DEFAULT (datetime('now')),
	PRIMARY KEY (resource_id, discord_user_id),
	FOREIGN KEY (resource_id) REFERENCES exchange_resources (id)
);

CREATE TABLE IF NOT EXISTS exchange_requests (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	resource_id INTEGER NOT NULL,
	recipient_discord_user_id TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'open'
		CHECK (status IN ('open', 'claimed', 'completed', 'cancelled')),
	claimed_by TEXT,
	claimed_at TEXT,
	created_at TEXT DEFAULT (datetime('now')),
	updated_at TEXT DEFAULT (datetime('now')),
	FOREIGN KEY (resource_id) REFERENCES exchange_resources (id)
);

CREATE INDEX IF NOT EXISTS idx_exchange_resources_guild ON exchange_resources (guild_id, active);
CREATE INDEX IF NOT EXISTS idx_exchange_donors_resource ON exchange_donors (resource_id);
CREATE INDEX IF NOT EXISTS idx_exchange_requests_resource_status ON exchange_requests (resource_id, status);
CREATE INDEX IF NOT EXISTS idx_exchange_requests_recipient ON exchange_requests (recipient_discord_user_id, status);
