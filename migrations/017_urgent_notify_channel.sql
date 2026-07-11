-- Staff "urgent" notifications (e.g. verification DM blocked by privacy settings).
-- Separate from audit_log_channel_id so admins can watch a short, high-signal channel.
ALTER TABLE guild_configs
    ADD COLUMN urgent_notify_channel_id TEXT;
