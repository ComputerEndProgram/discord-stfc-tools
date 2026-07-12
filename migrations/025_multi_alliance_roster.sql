-- Multi-alliance: server directory + per-alliance roster meta (composite key).

CREATE TABLE IF NOT EXISTS server_alliance_directory (
	guild_id TEXT NOT NULL,
	alliance_id TEXT NOT NULL,
	alliance_tag TEXT NOT NULL,
	alliance_name TEXT,
	server_rank INTEGER,
	player_count INTEGER,
	fetched_at TEXT NOT NULL,
	PRIMARY KEY (guild_id, alliance_id),
	FOREIGN KEY (guild_id) REFERENCES guild_configs (guild_id)
);

CREATE INDEX IF NOT EXISTS idx_server_alliance_directory_tag
	ON server_alliance_directory (guild_id, alliance_tag);

-- Recreate alliance_roster_meta with (guild_id, alliance_id) PK for multi scrapes.
CREATE TABLE alliance_roster_meta_v2 (
	guild_id TEXT NOT NULL,
	alliance_id TEXT NOT NULL,
	alliance_tag TEXT,
	alliance_name TEXT,
	player_count INTEGER NOT NULL DEFAULT 0,
	fetched_at TEXT NOT NULL,
	PRIMARY KEY (guild_id, alliance_id),
	FOREIGN KEY (guild_id) REFERENCES guild_configs (guild_id)
);

INSERT OR IGNORE INTO alliance_roster_meta_v2
	(guild_id, alliance_id, alliance_tag, alliance_name, player_count, fetched_at)
SELECT guild_id, alliance_id, alliance_tag, alliance_name, player_count, fetched_at
FROM alliance_roster_meta
WHERE alliance_id IS NOT NULL AND TRIM(alliance_id) != '';

DROP TABLE alliance_roster_meta;
ALTER TABLE alliance_roster_meta_v2 RENAME TO alliance_roster_meta;

CREATE INDEX IF NOT EXISTS idx_alliance_roster_members_alliance
	ON alliance_roster_members (guild_id, alliance_id);
