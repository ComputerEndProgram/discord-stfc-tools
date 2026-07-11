-- Hybrid welcome DM: source Discord message + personal-channel append.
ALTER TABLE guild_configs ADD COLUMN welcome_dm_enabled INTEGER DEFAULT 0;
ALTER TABLE guild_configs ADD COLUMN welcome_dm_channel_id TEXT;
ALTER TABLE guild_configs ADD COLUMN welcome_dm_message_id TEXT;

ALTER TABLE verified_players ADD COLUMN welcome_dm_sent_at TEXT;
