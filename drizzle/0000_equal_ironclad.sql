CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`event_date` text NOT NULL,
	`image_url` text NOT NULL,
	`category` text NOT NULL,
	`status` text NOT NULL,
	`whatsapp` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
