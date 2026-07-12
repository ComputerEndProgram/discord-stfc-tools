-- Track days_inactive on alliance roster cache (morning scrape for all members, Discord-linked or not).

ALTER TABLE alliance_roster_members ADD COLUMN days_inactive INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_alliance_roster_members_days_inactive
	ON alliance_roster_members (guild_id, days_inactive);
