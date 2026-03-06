/**
 * Database migration script — runs on Railway deploy and server startup.
 * Uses raw SQL with error handling so it is idempotent (safe to re-run).
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const databaseUrl =
  process.env.DATABASE_URL || "mysql://root:root@localhost:3306/pos";

const ALTERATIONS: { description: string; sql: string }[] = [
  {
    description: "Add cash_session_id column to sales",
    sql: `ALTER TABLE sales ADD COLUMN cash_session_id INT NULL`,
  },
  {
    description: "Add index on sales.cash_session_id",
    sql: `ALTER TABLE sales ADD INDEX sales_session_idx (cash_session_id)`,
  },
  {
    description: "Add FK sales.cash_session_id -> cash_sessions.id",
    sql: `ALTER TABLE sales ADD CONSTRAINT sales_cash_session_id_fk FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id)`,
  },
];

// Ignorable MySQL error codes (column/index/FK already exists)
const IGNORABLE_ERRNO = [1060, 1061, 1826, 1022];

export async function runStartupMigrations() {
  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection({ uri: databaseUrl });
    console.log("🔧 Running startup migrations...");

    for (const alt of ALTERATIONS) {
      try {
        await connection.query(alt.sql);
        console.log(`  ✅ ${alt.description}`);
      } catch (err: any) {
        if (IGNORABLE_ERRNO.includes(err.errno)) {
          console.log(`  ⏭️  ${alt.description} (already exists)`);
        } else {
          console.error(`  ❌ ${alt.description}:`, err.message);
        }
      }
    }

    console.log("🔧 Migrations complete.");
  } catch (err) {
    console.error("⚠️  Migration connection failed (server will start anyway):", (err as Error).message);
  } finally {
    if (connection) await connection.end();
  }
}

// When run as standalone script (node dist/db/migrate.js)
if (require.main === module) {
  runStartupMigrations().then(() => process.exit(0)).catch(() => process.exit(0));
}
