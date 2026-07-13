-- Optional survey auto-close: duration stored at create; absolute deadline set at send.

ALTER TABLE surveys ADD COLUMN close_after_seconds INTEGER;
ALTER TABLE surveys ADD COLUMN closes_at TEXT;

CREATE INDEX IF NOT EXISTS idx_surveys_closes_at
	ON surveys (status, closes_at);
