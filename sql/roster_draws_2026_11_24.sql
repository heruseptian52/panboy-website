-- Optional manual migration. The application also creates this table on first use.
-- Existing event, roster, member and finance rows are untouched.
CREATE TABLE IF NOT EXISTS roster_draws (
  event_id INTEGER PRIMARY KEY,
  group_count INTEGER NOT NULL,
  assignments_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
