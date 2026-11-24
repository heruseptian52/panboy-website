CREATE TABLE `finance_sponsor_income` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sponsor_name` text NOT NULL,
	`event_name` text DEFAULT '' NOT NULL,
	`amount` integer NOT NULL,
	`received_date` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`cancel_reason` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL
);
