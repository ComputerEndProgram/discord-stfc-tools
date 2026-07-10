-- Admin channel for verification audit posts (summary + screenshot).
ALTER TABLE guild_configs
    ADD COLUMN verification_log_channel_id TEXT;
