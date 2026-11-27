CREATE TABLE IF NOT EXISTS short_links (
 code TEXT PRIMARY KEY,
 destination TEXT NOT NULL UNIQUE,
 created_at TEXT NOT NULL
);
