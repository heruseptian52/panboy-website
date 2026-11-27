ALTER TABLE `admins` ADD `extra_permissions` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
UPDATE `admins` SET `extra_permissions` = '{"memberDues":true,"blacklist":true}' WHERE `can_members` = 1;
