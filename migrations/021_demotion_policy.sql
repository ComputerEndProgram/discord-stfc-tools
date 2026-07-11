-- Demotion policy + queue for resilient leave detection (approval vs YOLO).
ALTER TABLE guild_configs ADD COLUMN demotion_policy TEXT DEFAULT 'approval';

CREATE TABLE IF NOT EXISTS demotion_queue (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	guild_id TEXT NOT NULL,
	discord_user_id TEXT NOT NULL,
	player_id INTEGER,
	player_name TEXT,
	reason TEXT NOT NULL CHECK (reason IN ('alliance_mismatch', 'player_missing')),
	status TEXT NOT NULL CHECK (
		status IN (
			'pending_recheck',
			'pending_approval',
			'approved',
			'rejected',
			'completed',
			'cancelled'
		)
	),
	detect_count INTEGER NOT NULL DEFAULT 1,
	first_detected_at TEXT NOT NULL DEFAULT (datetime('now')),
	next_recheck_at TEXT,
	resolved_at TEXT,
	urgent_message_id TEXT,
	observed_alliance_tag TEXT,
	UNIQUE (guild_id, discord_user_id)
);

CREATE INDEX IF NOT EXISTS idx_demotion_queue_status
	ON demotion_queue (status, next_recheck_at);
CREATE INDEX IF NOT EXISTS idx_demotion_queue_guild
	ON demotion_queue (guild_id, status);
