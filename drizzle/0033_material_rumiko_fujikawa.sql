CREATE TABLE `finance_member_deductions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`period_id` integer NOT NULL,
	`member_id` integer NOT NULL,
	`team_name` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`period_id`) REFERENCES `finance_periods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_finance_member_deductions_period_member` ON `finance_member_deductions` (`period_id`,`member_id`);