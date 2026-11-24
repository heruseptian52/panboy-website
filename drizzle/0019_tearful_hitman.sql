PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_scoreboards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`mode` text DEFAULT 'team' NOT NULL,
	`point_system_id` integer,
	`owner_email` text NOT NULL,
	`template_url` text DEFAULT '' NOT NULL,
	`canvas_width` integer DEFAULT 1080 NOT NULL,
	`canvas_height` integer DEFAULT 1350 NOT NULL,
	`layout_json` text DEFAULT '{}' NOT NULL,
	`overlay_token` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`point_system_id`) REFERENCES `point_systems`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_scoreboards`("id", "name", "mode", "point_system_id", "owner_email", "template_url", "canvas_width", "canvas_height", "layout_json", "overlay_token", "created_at", "updated_at") SELECT "id", "name", "mode", "point_system_id", "owner_email", "template_url", CASE WHEN "template_url"='' AND "canvas_width"=1920 AND "canvas_height"=1080 THEN 1080 ELSE "canvas_width" END, CASE WHEN "template_url"='' AND "canvas_width"=1920 AND "canvas_height"=1080 THEN 1350 ELSE "canvas_height" END, "layout_json", "overlay_token", "created_at", "updated_at" FROM `scoreboards`;--> statement-breakpoint
DROP TABLE `scoreboards`;--> statement-breakpoint
ALTER TABLE `__new_scoreboards` RENAME TO `scoreboards`;--> statement-breakpoint
PRAGMA foreign_keys=ON;
