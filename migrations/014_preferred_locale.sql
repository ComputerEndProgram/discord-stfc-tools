-- Preferred UI language for player-facing DMs (ISO 639-1 / BCP-47 short code).
ALTER TABLE verified_players
    ADD COLUMN preferred_locale TEXT;
