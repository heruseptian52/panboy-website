CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`product_id` integer NOT NULL,
	`product_name` text NOT NULL,
	`product_type` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_whatsapp` text NOT NULL,
	`game_id` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`total` integer NOT NULL,
	`status` text DEFAULT 'Pesanan Masuk' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_code_unique` ON `orders` (`code`);--> statement-breakpoint
CREATE TABLE `partners` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`logo_url` text NOT NULL,
	`link_url` text DEFAULT '' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`price` integer NOT NULL,
	`image_url` text DEFAULT '' NOT NULL,
	`stock` text DEFAULT 'Tersedia' NOT NULL,
	`admin_whatsapp` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
