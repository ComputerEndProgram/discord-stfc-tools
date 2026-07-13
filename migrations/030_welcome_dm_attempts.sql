-- Cap auto welcome-DM retries (initial send + one retry) via attempt counter.

ALTER TABLE verified_players ADD COLUMN welcome_dm_attempts INTEGER NOT NULL DEFAULT 0;
