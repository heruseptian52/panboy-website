CREATE TABLE `community_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`logo_url` text NOT NULL,
	`instagram_username` text DEFAULT '' NOT NULL,
	`instagram_url` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `community_members_normalized_name_unique` ON `community_members` (`normalized_name`);--> statement-breakpoint
ALTER TABLE `admins` ADD `can_members` integer DEFAULT false NOT NULL;