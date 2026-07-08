-- Configurable "named buckets" that add extra Discord roles
-- for specific in-game alliance ranks (Operative/Agent/Premier/Commodore/Admiral).
ALTER TABLE guild_configs
    ADD COLUMN overlay_buckets TEXT DEFAULT '{}';

