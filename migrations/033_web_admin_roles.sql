-- Roles allowed to use the admin web UI (in addition to Discord Administrator).

ALTER TABLE guild_configs ADD COLUMN web_admin_role_ids TEXT DEFAULT '[]';
