ALTER TABLE `member_benefits` ADD `icon_name` text DEFAULT 'sparkles' NOT NULL;--> statement-breakpoint
ALTER TABLE `member_benefits` ADD `featured` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `member_benefits` ADD `cta_text` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `member_benefits` ADD `cta_url` text DEFAULT '' NOT NULL;
--> statement-breakpoint
INSERT INTO `member_benefits` (`title`,`description`,`icon_name`,`featured`,`active`,`sort_order`,`created_at`,`updated_at`)
SELECT 'EVENT COMMUNITY','Event Panboy Community setiap 1–2 bulan sekali.','calendar',1,1,1,datetime('now'),datetime('now') WHERE NOT EXISTS (SELECT 1 FROM `member_benefits` WHERE `title`='EVENT COMMUNITY');
--> statement-breakpoint
INSERT INTO `member_benefits` (`title`,`description`,`icon_name`,`featured`,`active`,`sort_order`,`created_at`,`updated_at`)
SELECT 'PRIZE POOL','Prize pool event mulai Rp1.000.000.','trophy',1,1,2,datetime('now'),datetime('now') WHERE NOT EXISTS (SELECT 1 FROM `member_benefits` WHERE `title`='PRIZE POOL');
--> statement-breakpoint
INSERT INTO `member_benefits` (`title`,`description`,`icon_name`,`featured`,`active`,`sort_order`,`created_at`,`updated_at`)
SELECT 'MORE EVENTS','Akan ada berbagai event & program menarik lainnya ke depannya.','rocket',0,1,3,datetime('now'),datetime('now') WHERE NOT EXISTS (SELECT 1 FROM `member_benefits` WHERE `title`='MORE EVENTS');
--> statement-breakpoint
INSERT INTO `member_benefits` (`title`,`description`,`icon_name`,`featured`,`active`,`sort_order`,`created_at`,`updated_at`)
SELECT 'HITUNG POINT OTOMATIS','Hitung point dan leaderboard turnamen dengan lebih cepat dan praktis.','calculator',1,1,4,datetime('now'),datetime('now') WHERE NOT EXISTS (SELECT 1 FROM `member_benefits` WHERE `title`='HITUNG POINT OTOMATIS');
--> statement-breakpoint
INSERT INTO `member_benefits` (`title`,`description`,`icon_name`,`featured`,`active`,`sort_order`,`created_at`,`updated_at`)
SELECT 'UPLOAD & KELOLA EVENT','Upload dan kelola event sendiri melalui akses admin yang diberikan Panboy.','upload',1,1,5,datetime('now'),datetime('now') WHERE NOT EXISTS (SELECT 1 FROM `member_benefits` WHERE `title`='UPLOAD & KELOLA EVENT');
--> statement-breakpoint
INSERT INTO `member_benefits` (`title`,`description`,`icon_name`,`featured`,`active`,`sort_order`,`created_at`,`updated_at`)
SELECT 'PUBLIKASI EVENT','Event dapat dipublikasikan melalui website Panboy Community.','megaphone',0,1,6,datetime('now'),datetime('now') WHERE NOT EXISTS (SELECT 1 FROM `member_benefits` WHERE `title`='PUBLIKASI EVENT');
--> statement-breakpoint
INSERT INTO `member_benefits` (`title`,`description`,`icon_name`,`featured`,`active`,`sort_order`,`created_at`,`updated_at`)
SELECT 'TOOLS LEADERBOARD','Akses berbagai tools leaderboard untuk membantu pengelolaan turnamen.','chart',0,1,7,datetime('now'),datetime('now') WHERE NOT EXISTS (SELECT 1 FROM `member_benefits` WHERE `title`='TOOLS LEADERBOARD');
--> statement-breakpoint
INSERT INTO `member_benefits` (`title`,`description`,`icon_name`,`featured`,`active`,`sort_order`,`created_at`,`updated_at`)
SELECT 'OFFICIAL MEMBER','Logo dan nama team tampil sebagai Member Panboy Community.','shield',0,1,8,datetime('now'),datetime('now') WHERE NOT EXISTS (SELECT 1 FROM `member_benefits` WHERE `title`='OFFICIAL MEMBER');
--> statement-breakpoint
INSERT INTO `member_benefits` (`title`,`description`,`icon_name`,`featured`,`active`,`sort_order`,`created_at`,`updated_at`)
SELECT 'COMMUNITY & COLLABORATION','Kesempatan mengikuti kolaborasi dan berbagai program komunitas.','handshake',0,1,9,datetime('now'),datetime('now') WHERE NOT EXISTS (SELECT 1 FROM `member_benefits` WHERE `title`='COMMUNITY & COLLABORATION');
--> statement-breakpoint
INSERT INTO `member_benefits` (`title`,`description`,`icon_name`,`featured`,`active`,`sort_order`,`created_at`,`updated_at`)
SELECT 'MORE BENEFITS COMING','Benefit akan terus ditambah dan dikembangkan ke depannya.','sparkles',0,1,10,datetime('now'),datetime('now') WHERE NOT EXISTS (SELECT 1 FROM `member_benefits` WHERE `title`='MORE BENEFITS COMING');
