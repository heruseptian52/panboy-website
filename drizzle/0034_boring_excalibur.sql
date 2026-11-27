ALTER TABLE `finance_expenses` ADD `status` text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE `finance_expenses` ADD `cancel_reason` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `finance_member_deductions` ADD `created_by` text DEFAULT 'SYSTEM' NOT NULL;--> statement-breakpoint
ALTER TABLE `finance_member_deductions` ADD `status` text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE `finance_periods` ADD `event_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `finance_periods` ADD `month` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `finance_periods` ADD `year` integer DEFAULT 2026 NOT NULL;