ALTER TABLE `event_registrations` ADD `team_id` integer;--> statement-breakpoint
ALTER TABLE `event_registrations` ADD `captain_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `event_registrations` ADD `registration_status` text DEFAULT 'submitted' NOT NULL;