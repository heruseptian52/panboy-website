ALTER TABLE `admins` ADD `can_leaderboard_design` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `admins` ADD `can_live_obs` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `admins` SET `can_leaderboard_design`=`can_leaderboard`, `can_live_obs`=`can_leaderboard`;
