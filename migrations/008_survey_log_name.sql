-- Survey log channel naming (default survey-{id} when null).

ALTER TABLE guild_configs ADD COLUMN survey_log_name_template TEXT;
