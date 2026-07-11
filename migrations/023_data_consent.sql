-- GDPR-style data-processing consent (before verification), separate from optional CoC.
ALTER TABLE guild_configs ADD COLUMN data_consent_enabled INTEGER DEFAULT 0;
ALTER TABLE guild_configs ADD COLUMN data_consent_version TEXT DEFAULT '1';

ALTER TABLE verified_players ADD COLUMN data_consent_at TEXT;
ALTER TABLE verified_players ADD COLUMN data_consent_version TEXT;
ALTER TABLE verified_players ADD COLUMN data_consent_choice TEXT;
ALTER TABLE verified_players ADD COLUMN data_consent_method TEXT;
