-- Additive migration; no changes to existing tables or data.
CREATE TABLE IF NOT EXISTS showcase_ads (
 id TEXT PRIMARY KEY, internal_name TEXT NOT NULL, member_id INTEGER,
 status TEXT NOT NULL CHECK(status IN ('draft','published','inactive')),
 starts_at TEXT NOT NULL DEFAULT '', ends_at TEXT NOT NULL DEFAULT '',
 priority INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0,
 content_json TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_showcase_active ON showcase_ads(status,priority DESC,sort_order);
CREATE TABLE IF NOT EXISTS showcase_config (id INTEGER PRIMARY KEY CHECK(id=1), config_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS showcase_stats (
 ad_id TEXT NOT NULL, metric TEXT NOT NULL, total INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(ad_id,metric)
);
