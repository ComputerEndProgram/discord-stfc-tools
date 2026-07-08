-- Rank-based role assignment config (independent from grade logic)
ALTER TABLE guild_configs
    ADD COLUMN operative_role_ids TEXT DEFAULT '[]';

ALTER TABLE guild_configs
    ADD COLUMN agent_role_ids TEXT DEFAULT '[]';

ALTER TABLE guild_configs
    ADD COLUMN premier_role_ids TEXT DEFAULT '[]';

ALTER TABLE guild_configs
    ADD COLUMN commodore_role_ids TEXT DEFAULT '[]';

ALTER TABLE guild_configs
    ADD COLUMN admiral_role_ids TEXT DEFAULT '[]';

