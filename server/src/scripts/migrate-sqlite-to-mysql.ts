/**
 * SQLite → MySQL Data Migration Script
 *
 * Reads all data from the existing SQLite database and inserts it into MySQL,
 * converting Unix epoch timestamps to Date objects and integer booleans to true/false.
 *
 * Usage:
 *   DATABASE_URL=mysql://user:pass@host:3306/db npx tsx src/scripts/migrate-sqlite-to-mysql.ts [path-to-sqlite.db]
 *
 * Prerequisites:
 *   - npm install better-sqlite3 (as devDependency for this one-time migration)
 *   - MySQL database already created with schema (run `npm run db:push` first)
 *   - DATABASE_URL environment variable set
 */

import Database from "better-sqlite3";
import mysql from "mysql2/promise";
import path from "path";

const SQLITE_PATH = process.argv[2] || path.resolve(__dirname, "../../db.sqlite");

// Tables in FK-safe insertion order
const MIGRATION_ORDER = [
  "users",
  "category_stock_thresholds",
  "products",
  "sales",
  "sale_items",
  "settings",
  "cash_sessions",
  "cash_movements",
  "promotions",
  "fiscal_documents",
  "customers",
  "customer_debts",
  "returns",
  "return_items",
  "audit_log",
  "supplier_invoices",
  "supplier_invoice_items",
  "supplier_invoice_payments",
];

// Columns that store Unix epoch seconds and need Date conversion
const TIMESTAMP_COLUMNS: Record<string, string[]> = {
  users: ["created_at"],
  category_stock_thresholds: ["created_at", "updated_at"],
  products: ["deleted_at", "created_at", "updated_at"],
  sales: ["voided_at", "created_at"],
  settings: ["updated_at"],
  cash_sessions: ["open_time", "close_time", "window_open", "window_close"],
  cash_movements: ["created_at"],
  promotions: ["start_date", "end_date", "created_at", "updated_at"],
  fiscal_documents: ["created_at", "updated_at"],
  customers: ["last_purchase", "created_at", "updated_at"],
  customer_debts: ["due_date", "created_at", "updated_at"],
  returns: ["created_at"],
  audit_log: ["created_at"],
  supplier_invoices: ["invoice_date", "due_date", "created_at", "updated_at"],
  supplier_invoice_items: [],
  supplier_invoice_payments: ["payment_date", "created_at"],
};

// Columns that store 0/1 integers and need boolean conversion
const BOOLEAN_COLUMNS: Record<string, string[]> = {
  users: ["active"],
  promotions: ["active"],
  // Note: customers.active is int in MySQL schema (not boolean), kept as-is
};

// Columns that store JSON as text
const JSON_COLUMNS: Record<string, string[]> = {
  settings: ["value"],
  promotions: ["product_ids"],
  fiscal_documents: ["response"],
  audit_log: ["details"],
};

function epochToDate(epoch: number | null): Date | null {
  if (epoch === null || epoch === undefined) return null;
  return new Date(epoch * 1000);
}

function convertRow(
  table: string,
  row: Record<string, any>
): Record<string, any> {
  const result = { ...row };

  // Convert timestamp columns
  const tsColumns = TIMESTAMP_COLUMNS[table] || [];
  for (const col of tsColumns) {
    if (col in result && result[col] !== null) {
      result[col] = epochToDate(result[col]);
    }
  }

  // Convert boolean columns
  const boolColumns = BOOLEAN_COLUMNS[table] || [];
  for (const col of boolColumns) {
    if (col in result) {
      result[col] = result[col] === 1 || result[col] === true;
    }
  }

  // Parse JSON text columns (SQLite stores as text, MySQL expects objects)
  const jsonColumns = JSON_COLUMNS[table] || [];
  for (const col of jsonColumns) {
    if (col in result && result[col] !== null && typeof result[col] === "string") {
      try {
        result[col] = JSON.parse(result[col]);
      } catch {
        // Leave as-is if not valid JSON
      }
    }
  }

  return result;
}

async function migrate() {
  console.log("=== SQLite → MySQL Migration ===\n");

  // Connect to SQLite
  console.log(`Opening SQLite: ${SQLITE_PATH}`);
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  sqlite.pragma("journal_mode = WAL");

  // Connect to MySQL
  const mysqlUrl = process.env.DATABASE_URL;
  if (!mysqlUrl) {
    console.error("ERROR: DATABASE_URL environment variable is required");
    process.exit(1);
  }
  console.log("Connecting to MySQL...");
  const pool = await mysql.createPool({
    uri: mysqlUrl,
    connectionLimit: 5,
    timezone: "+00:00",
  });

  // Verify MySQL connection
  const [rows] = await pool.execute("SELECT 1 as ok");
  console.log("MySQL connected successfully\n");

  // Disable FK checks for bulk insert
  await pool.execute("SET FOREIGN_KEY_CHECKS = 0");

  const stats: Record<string, { total: number; migrated: number; errors: number }> = {};
  let totalErrors = 0;

  for (const table of MIGRATION_ORDER) {
    // Check if table exists in SQLite
    const tableExists = sqlite
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
      )
      .get(table) as any;

    if (!tableExists) {
      console.log(`⏭ ${table}: table not found in SQLite, skipping`);
      stats[table] = { total: 0, migrated: 0, errors: 0 };
      continue;
    }

    // Read all rows from SQLite
    const sqliteRows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as Record<string, any>[];
    stats[table] = { total: sqliteRows.length, migrated: 0, errors: 0 };

    if (sqliteRows.length === 0) {
      console.log(`⏭ ${table}: 0 rows, skipping`);
      continue;
    }

    console.log(`📦 ${table}: migrating ${sqliteRows.length} rows...`);

    // Clear existing data in MySQL table
    await pool.execute(`DELETE FROM \`${table}\``);

    // Insert in batches of 100
    const BATCH_SIZE = 100;
    for (let i = 0; i < sqliteRows.length; i += BATCH_SIZE) {
      const batch = sqliteRows.slice(i, i + BATCH_SIZE);
      const convertedBatch = batch.map((row) => convertRow(table, row));

      for (const row of convertedBatch) {
        try {
          const columns = Object.keys(row);
          const placeholders = columns.map(() => "?").join(", ");
          const values = columns.map((col) => {
            const val = row[col];
            // Convert JS objects/arrays to JSON strings for MySQL JSON columns
            if (val !== null && typeof val === "object" && !(val instanceof Date)) {
              return JSON.stringify(val);
            }
            return val;
          });

          await pool.execute(
            `INSERT INTO \`${table}\` (${columns
              .map((c) => `\`${c}\``)
              .join(", ")}) VALUES (${placeholders})`,
            values
          );
          stats[table].migrated++;
        } catch (error: any) {
          stats[table].errors++;
          totalErrors++;
          if (stats[table].errors <= 3) {
            console.error(
              `  ❌ Error inserting row in ${table}:`,
              error.message
            );
            console.error(`     Row data:`, JSON.stringify(row).slice(0, 200));
          }
        }
      }
    }

    console.log(
      `  ✅ ${stats[table].migrated}/${stats[table].total} rows migrated` +
        (stats[table].errors > 0
          ? ` (${stats[table].errors} errors)`
          : "")
    );
  }

  // Re-enable FK checks
  await pool.execute("SET FOREIGN_KEY_CHECKS = 1");

  // Reset AUTO_INCREMENT values
  console.log("\n🔧 Resetting auto-increment counters...");
  for (const table of MIGRATION_ORDER) {
    if (stats[table].migrated > 0) {
      try {
        const [maxRows]: any = await pool.execute(
          `SELECT MAX(id) as maxId FROM \`${table}\``
        );
        const maxId = maxRows[0]?.maxId;
        if (maxId) {
          await pool.execute(
            `ALTER TABLE \`${table}\` AUTO_INCREMENT = ${maxId + 1}`
          );
        }
      } catch {
        // Table might not have auto-increment id (e.g., settings, customers)
      }
    }
  }

  // Print summary
  console.log("\n=== Migration Summary ===");
  console.log("Table".padEnd(30) + "Total".padStart(8) + "OK".padStart(8) + "Errors".padStart(8));
  console.log("-".repeat(54));
  for (const [table, s] of Object.entries(stats)) {
    console.log(
      table.padEnd(30) +
        String(s.total).padStart(8) +
        String(s.migrated).padStart(8) +
        String(s.errors).padStart(8)
    );
  }
  console.log("-".repeat(54));
  const totalMigrated = Object.values(stats).reduce((a, s) => a + s.migrated, 0);
  const totalRows = Object.values(stats).reduce((a, s) => a + s.total, 0);
  console.log(
    "TOTAL".padEnd(30) +
      String(totalRows).padStart(8) +
      String(totalMigrated).padStart(8) +
      String(totalErrors).padStart(8)
  );

  if (totalErrors > 0) {
    console.log(`\n⚠️  ${totalErrors} errors occurred during migration`);
  } else {
    console.log("\n✅ Migration completed successfully!");
  }

  // Cleanup
  sqlite.close();
  await pool.end();
}

migrate().catch((err) => {
  console.error("Fatal migration error:", err);
  process.exit(1);
});
