CREATE TABLE `finance_operating_transfers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period_id` integer NOT NULL,
	`event_name` text NOT NULL,
	`sponsor_amount` integer DEFAULT 0 NOT NULL,
	`registration_amount` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`cancel_reason` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
