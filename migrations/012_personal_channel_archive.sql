-- Category for member channels that are no longer linked to a verified player.
ALTER TABLE guild_configs
    ADD COLUMN personal_channel_archive_category_id TEXT;
