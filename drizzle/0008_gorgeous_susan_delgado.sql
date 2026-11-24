CREATE TABLE `analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`visitor_id` text NOT NULL,
	`event_type` text NOT NULL,
	`path` text NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`device` text DEFAULT 'desktop' NOT NULL,
	`created_at` text NOT NULL
);
