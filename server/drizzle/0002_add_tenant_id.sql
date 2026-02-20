CREATE TABLE `category_stock_thresholds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text,
	`category` text NOT NULL,
	`min_stock` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_stock_thresholds_category_unique` ON `category_stock_thresholds` (`category`);--> statement-breakpoint
CREATE INDEX `category_thresholds_tenant_idx` ON `category_stock_thresholds` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `category_thresholds_category_idx` ON `category_stock_thresholds` (`category`);--> statement-breakpoint
ALTER TABLE `audit_log` ADD `tenant_id` text;--> statement-breakpoint
CREATE INDEX `audit_log_tenant_idx` ON `audit_log` (`tenant_id`);--> statement-breakpoint
ALTER TABLE `cash_sessions` ADD `tenant_id` text;--> statement-breakpoint
CREATE INDEX `cash_sessions_tenant_idx` ON `cash_sessions` (`tenant_id`);--> statement-breakpoint
ALTER TABLE `products` ADD `tenant_id` text;--> statement-breakpoint
ALTER TABLE `products` ADD `supplier` text;--> statement-breakpoint
ALTER TABLE `products` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `products` ADD `updated_at` integer;--> statement-breakpoint
CREATE INDEX `products_tenant_idx` ON `products` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `products_supplier_idx` ON `products` (`supplier`);--> statement-breakpoint
CREATE INDEX `products_name_idx` ON `products` (`name`);--> statement-breakpoint
ALTER TABLE `promotions` ADD `tenant_id` text;--> statement-breakpoint
CREATE INDEX `promotions_tenant_idx` ON `promotions` (`tenant_id`);--> statement-breakpoint
ALTER TABLE `sales` ADD `tenant_id` text;--> statement-breakpoint
CREATE INDEX `sales_tenant_idx` ON `sales` (`tenant_id`);--> statement-breakpoint
ALTER TABLE `settings` ADD `tenant_id` text;--> statement-breakpoint
CREATE INDEX `settings_tenant_idx` ON `settings` (`tenant_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `tenant_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `email` text;--> statement-breakpoint
ALTER TABLE `users` ADD `active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `cash_register_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `created_by` integer REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `users_tenant_idx` ON `users` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `users_active_idx` ON `users` (`active`);--> statement-breakpoint
CREATE INDEX `users_created_by_idx` ON `users` (`created_by`);