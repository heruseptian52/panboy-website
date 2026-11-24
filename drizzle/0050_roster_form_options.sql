ALTER TABLE `roster_entries` ADD `zones_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `roster_events` ADD `options_json` text DEFAULT '{}' NOT NULL;