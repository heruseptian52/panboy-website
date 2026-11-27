CREATE INDEX `idx_analytics_events_created_type` ON `analytics_events` (`created_at`,`event_type`);--> statement-breakpoint
CREATE INDEX `idx_event_registrations_event_payment` ON `event_registrations` (`event_id`,`payment_status`);--> statement-breakpoint
CREATE INDEX `idx_events_public_dates` ON `events` (`deleted_at`,`end_date`,`start_date`);--> statement-breakpoint
CREATE INDEX `idx_scoreboard_matches_board_number` ON `scoreboard_matches` (`scoreboard_id`,`match_number`);--> statement-breakpoint
CREATE INDEX `idx_scoreboard_results_match_team_updated` ON `scoreboard_results` (`match_id`,`team_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_scoreboard_teams_board_slot` ON `scoreboard_teams` (`scoreboard_id`,`slot_number`);