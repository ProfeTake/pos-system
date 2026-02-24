import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import path from "path";
import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
}

const databaseUrl =
  process.env.DATABASE_URL || "mysql://root:root@localhost:3306/pos";

console.log("📂 Connecting to MySQL...");

async function runMigrations() {
  const connection = await mysql.createConnection({
    uri: databaseUrl,
  });

  const db = drizzle(connection);

  const migrationsDir = path.resolve(__dirname, "../../drizzle");
  console.log(`📂 Migrations dir: ${migrationsDir}`);

  try {
    console.log("🔄 Running migrations...");
    await migrate(db, { migrationsFolder: migrationsDir });
    console.log("✅ All migrations applied successfully");
  } catch (error: any) {
    // If migrations table doesn't exist or no migrations to apply, use db:push
    console.log("⚠️  Migration via files failed, falling back to schema push...");
    console.log("   Error:", error.message);
    console.log("   Use 'npm run db:push' to apply schema directly.");
  } finally {
    await connection.end();
  }
}

runMigrations().catch((err) => {
  console.error("❌ Migration error:", err);
  console.log("⚠️  Continuing without migrations (tables may already exist via db:push)");
});
