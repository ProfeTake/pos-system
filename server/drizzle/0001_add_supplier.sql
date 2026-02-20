-- Agregar campo supplier (proveedor) a la tabla products
ALTER TABLE `products` ADD COLUMN `supplier` text;
--> statement-breakpoint
CREATE INDEX `products_supplier_idx` ON `products` (`supplier`);
--> statement-breakpoint

-- Agregar nuevos campos a la tabla users para gestión de usuarios de tienda
ALTER TABLE `users` ADD COLUMN `email` text;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `active` integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `cash_register_id` text;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `created_by` integer REFERENCES `users`(`id`);
--> statement-breakpoint
CREATE INDEX `users_active_idx` ON `users` (`active`);
--> statement-breakpoint
CREATE INDEX `users_created_by_idx` ON `users` (`created_by`);
--> statement-breakpoint

-- Crear tabla para umbrales de stock por categoría
CREATE TABLE `category_stock_thresholds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL UNIQUE,
	`min_stock` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `category_thresholds_category_idx` ON `category_stock_thresholds` (`category`);
