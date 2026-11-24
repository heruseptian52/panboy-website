CREATE TABLE `blacklist_players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` text NOT NULL,
	`player_name` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`nickname` text DEFAULT '' NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`evidence_link` text DEFAULT '' NOT NULL,
	`evidence_key` text DEFAULT '' NOT NULL,
	`member_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`approved_at` text DEFAULT '' NOT NULL,
	`reviewed_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_blacklist_status_approved` ON `blacklist_players` (`status`,`approved_at`);--> statement-breakpoint
CREATE INDEX `idx_blacklist_player_id` ON `blacklist_players` (`player_id`);--> statement-breakpoint
CREATE TABLE `blacklist_support` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`blacklist_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`blacklist_id`) REFERENCES `blacklist_players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_blacklist_support_member` ON `blacklist_support` (`blacklist_id`,`member_id`);