-- General bot audit log (admin actions + automated events). Separate from verification_log_channel_id.
ALTER TABLE guild_configs
    ADD COLUMN audit_log_channel_id TEXT;
