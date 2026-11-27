ALTER TABLE `finance_member_deductions` ADD `cancel_reason` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `finance_periods` ADD `status` text DEFAULT 'ACTIVE' NOT NULL;