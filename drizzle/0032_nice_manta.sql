CREATE TABLE `finance_expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period_id` integer NOT NULL,
	`event_name` text NOT NULL,
	`item_name` text NOT NULL,
	`category` text DEFAULT 'Lainnya' NOT NULL,
	`amount` integer NOT NULL,
	`expense_date` text NOT NULL,
	`proof_url` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`period_id`) REFERENCES `finance_periods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `finance_periods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`deduction_per_member` integer DEFAULT 10000 NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `admins` ADD `can_finance` integer DEFAULT false NOT NULL;