import { relations } from "drizzle-orm/relations";
import { cashSessions, cashMovements, users, products, saleItems, sales, auditLog } from "./schema";

export const cashMovementsRelations = relations(cashMovements, ({one}) => ({
	cashSession: one(cashSessions, {
		fields: [cashMovements.sessionId],
		references: [cashSessions.id]
	}),
}));

export const cashSessionsRelations = relations(cashSessions, ({one, many}) => ({
	cashMovements: many(cashMovements),
	user: one(users, {
		fields: [cashSessions.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	cashSessions: many(cashSessions),
	auditLogs: many(auditLog),
	sales: many(sales),
}));

export const saleItemsRelations = relations(saleItems, ({one}) => ({
	product: one(products, {
		fields: [saleItems.productId],
		references: [products.id]
	}),
	sale: one(sales, {
		fields: [saleItems.saleId],
		references: [sales.id]
	}),
}));

export const productsRelations = relations(products, ({many}) => ({
	saleItems: many(saleItems),
}));

export const salesRelations = relations(sales, ({one, many}) => ({
	saleItems: many(saleItems),
	user: one(users, {
		fields: [sales.voidedBy],
		references: [users.id]
	}),
}));

export const auditLogRelations = relations(auditLog, ({one}) => ({
	user: one(users, {
		fields: [auditLog.userId],
		references: [users.id]
	}),
}));