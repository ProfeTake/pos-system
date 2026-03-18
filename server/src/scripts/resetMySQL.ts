/**
 * Script: db:reset:mysql
 * Limpia TODAS las tablas de la base de datos MySQL y recrea desde cero
 * con un único usuario admin: punto3 / punto123
 *
 * TRUNCATE resetea los AUTO_INCREMENT a 1 automáticamente en MySQL.
 *
 * Uso:
 *   npm run db:reset:mysql -- --force    (en /server)
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { hashPassword } from "../utils/password";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const args = new Set(process.argv.slice(2));
if (!args.has("--force")) {
  console.error("Abortado: añade --force para confirmar el reseteo.");
  process.exit(1);
}

// Horario real del negocio
const businessHoursV2 = {
  week: {
    "0": { open: true, openTime: "12:00", closeTime: "01:00", closeNextDay: true },
    "1": { open: true, openTime: "12:37", closeTime: "01:00", closeNextDay: true },
    "2": { open: true, openTime: "12:37", closeTime: "01:00", closeNextDay: true },
    "3": { open: true, openTime: "12:37", closeTime: "01:00", closeNextDay: true },
    "4": { open: true, openTime: "12:37", closeTime: "01:00", closeNextDay: true },
    "5": { open: true, openTime: "12:00", closeTime: "03:00", closeNextDay: true },
    "6": { open: true, openTime: "12:00", closeTime: "03:00", closeNextDay: true },
  },
};

async function reset() {
  console.log("⚠️  Iniciando reseteo completo de la base de datos...\n");

  // 1. Deshabilitar FK checks para poder truncar en cualquier orden
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
  console.log("🔓 FK checks deshabilitados");

  // 2. Truncar todas las tablas (AUTO_INCREMENT vuelve a 1)
  const tables = [
    "supplier_invoice_payments",
    "supplier_invoice_items",
    "supplier_invoices",
    "return_items",
    "returns",
    "customer_debts",
    "customers",
    "fiscal_documents",
    "promotions",
    "cash_movements",
    "cash_sessions",
    "sale_items",
    "sales",
    "products",
    "category_stock_thresholds",
    "audit_log",
    "settings",
    "users",
  ];

  for (const table of tables) {
    await db.execute(sql.raw(`TRUNCATE TABLE \`${table}\``));
    console.log(`  🗑️  ${table} truncado`);
  }

  // 3. Re-habilitar FK checks
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
  console.log("\n🔒 FK checks re-habilitados");

  // 4. Crear usuario admin: punto3 / punto123 (id=1)
  const passwordHash = await hashPassword("punto123");
  await db.execute(
    sql`INSERT INTO users (id, username, password_hash, role, full_name, active)
        VALUES (1, 'punto3', ${passwordHash}, 'admin', 'Punto 3', 1)`
  );
  console.log("\n✅ Usuario creado:");
  console.log("   User: punto3");
  console.log("   Pass: punto123");
  console.log("   Role: admin");
  console.log("   ID  : 1");

  // 5. Insertar horarios operativos
  await db.execute(
    sql`INSERT INTO settings (\`key\`, value) 
        VALUES ('businessHoursV2', ${JSON.stringify(businessHoursV2)})`
  );
  console.log("\n✅ Horarios insertados:");
  console.log("   Lun–Jue : 12:37 → 01:00 AM");
  console.log("   Vie–Sáb : 12:00 → 03:00 AM");
  console.log("   Dom     : 12:00 → 01:00 AM");

  console.log("\n🎉 Reseteo completado. Base de datos lista para producción.");
  process.exit(0);
}

reset().catch((err) => {
  console.error("\n❌ Error durante el reseteo:", err?.message || err);
  process.exit(1);
});
