-- Guild deploy mode: testing (safe dry-run) vs live (full automation).
-- Existing guilds default to live; brand-new /server setup starts in testing.
ALTER TABLE guild_configs ADD COLUMN deploy_mode TEXT NOT NULL DEFAULT 'live'
	CHECK (deploy_mode IN ('testing', 'live'));
