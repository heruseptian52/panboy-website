ALTER TABLE `scoreboards` ADD `template_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `scoreboards` ADD `canvas_width` integer DEFAULT 1920 NOT NULL;--> statement-breakpoint
ALTER TABLE `scoreboards` ADD `canvas_height` integer DEFAULT 1080 NOT NULL;--> statement-breakpoint
ALTER TABLE `scoreboards` ADD `layout_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `scoreboards` ADD `overlay_token` text DEFAULT '' NOT NULL;