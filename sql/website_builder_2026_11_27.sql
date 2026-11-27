CREATE TABLE IF NOT EXISTS website_builder_state (
 id INTEGER PRIMARY KEY CHECK(id=1),
 value TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
