ÑCREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`username` text,
	`action` text NOT NULL,
	`entity` text,
	`entity_id` integer,
	`details` text,
	`ip_address` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_log_user_id_idx` ON `audit_log` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_log_action_idx` ON `audit_log` (`action`);--> statement-breakpoint
CREATE INDEX `audit_log_created_idx` ON `audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_log_entity_idx` ON `audit_log` (`entity`,`entity_id`);--> statement-breakpoint
CREATE TABLE `cash_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`session_id`) REFERENCES `cash_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `cash_movements_session_id_idx` ON `cash_movements` (`session_id`);--> statement-breakpoint
CREATE INDEX `cash_movements_created_idx` ON `cash_movements` (`created_at`);--> statement-breakpoint
CREATE TABLE `cash_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`open_time` integer NOT NULL,
	`close_time` integer,
	`initial_cash` integer NOT NULL,
	`final_cash` integer,
	`declared_cash` integer,
	`difference` integer,
	`notes` text,
	`window_close` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cash_sessions_user_id_idx` ON `cash_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `cash_sessions_open_time_idx` ON `cash_sessions` (`open_time`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`min_stock` integer DEFAULT 0 NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	`cost` integer DEFAULT 0 NOT NULL,
	`margin_pct` real DEFAULT 30 NOT NULL,
	`bar_code` text,
	`ml` integer DEFAULT 0,
	`measure_unit` text DEFAULT 'ml',
	`estado` text DEFAULT 'NORMAL',
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category`);--> statement-breakpoint
CREATE INDEX `products_estado_idx` ON `products` (`estado`);--> statement-breakpoint
CREATE INDEX `products_created_idx` ON `products` (`created_at`);--> statement-breakpoint
CREATE INDEX `products_barcode_idx` ON `products` (`bar_code`);--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`value` real,
	`active` integer DEFAULT true NOT NULL,
	`scope` text DEFAULT 'product' NOT NULL,
	`product_ids` text,
	`category_name` text,
	`start_date` integer,
	`end_date` integer,
	`max_uses` integer,
	`used_count` integer DEFAULT 0 NOT NULL,
	`min_purchase` integer,
	`bundle_qty` integer,
	`bundle_price` integer,
	`barcode` text,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `promotions_active_idx` ON `promotions` (`active`);--> statement-breakpoint
CREATE INDEX `promotions_barcode_idx` ON `promotions` (`barcode`);--> statement-breakpoint
CREATE INDEX `promotions_dates_idx` ON `promotions` (`start_date`,`end_date`);--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`product_name` text NOT NULL,
	`quantity` integer NOT NULL,
	`price` integer NOT NULL,
	`subtotal` integer NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sale_items_sale_id_idx` ON `sale_items` (`sale_id`);--> statement-breakpoint
CREATE INDEX `sale_items_product_id_idx` ON `sale_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `sale_items_sale_product_idx` ON `sale_items` (`sale_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`total` integer NOT NULL,
	`payment_method` text NOT NULL,
	`customer_name` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`voided_at` integer,
	`voided_by` integer,
	`void_reason` text,
	`original_sale_id` integer,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`voided_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sales_created_idx` ON `sales` (`created_at`);--> statement-breakpoint
CREATE INDEX `sales_payment_method_idx` ON `sales` (`payment_method`);--> statement-breakpoint
CREATE INDEX `sales_status_idx` ON `sales` (`status`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'vendedor' NOT NULL,
	`full_name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_created_idx` ON `users` (`created_at`);