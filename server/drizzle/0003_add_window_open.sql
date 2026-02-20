-- Add windowOpen column to cash_sessions for shift detection
ALTER TABLE cash_sessions ADD COLUMN window_open INTEGER;
