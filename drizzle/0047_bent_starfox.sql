ALTER TABLE `roster_uploads` ADD `size_bytes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `roster_uploads` ADD `ready` integer DEFAULT 0 NOT NULL;