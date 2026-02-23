import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
}

const dbPath = process.env.DATABASE_URL || path.resolve(__dirname, "../../db.sqlite");
console.log(`📂 Database path: ${dbPath}`);

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Create migrations tracking table
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    applied_at INTEGER DEFAULT (unixepoch())
  );
`);

// Read and apply migration files in order
const migrationsDir = path.resolve(__dirname, "../../drizzle");
console.log(`📂 Migrations dir: ${migrationsDir}`);

if (!fs.existsSync(migrationsDir)) {
  console.log("⚠️  No migrations directory found. Skipping.");
  process.exit(0);
}

const sqlFiles = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith(".sql"))
  .sort();

console.log(`📋 Found ${sqlFiles.length} migration files`);

for (const file of sqlFiles) {
  // Check if already applied
  const existing = sqlite.prepare(
    "SELECT id FROM __drizzle_migrations WHERE filename = ?"
  ).get(file);

  if (existing) {
    console.log(`  ✅ ${file} (already applied)`);
    continue;
  }

  console.log(`  🔄 Applying ${file}...`);
  const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
  
  // Split by drizzle statement breakpoint marker
  const statements = sql
    .split("--> statement-breakpoint")
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const applyMigration = sqlite.transaction(() => {
    for (const stmt of statements) {
      try {
        // Clean any BOM or weird characters
        const cleanStmt = stmt.replace(/^\uFEFF/, '').replace(/^Ñ/, '');
        sqlite.exec(cleanStmt);
      } catch (err: any) {
        // Skip "already exists" errors (idempotent)
        if (err.message?.includes("already exists")) {
          console.log(`    ⚠️  Skipped (already exists): ${err.message.substring(0, 80)}`);
        } else {
          throw err;
        }
      }
    }
    sqlite.prepare(
      "INSERT INTO __drizzle_migrations (filename) VALUES (?)"
    ).run(file);
  });

  applyMigration();
  console.log(`  ✅ ${file} applied`);
}

console.log("✅ All migrations applied successfully");
sqlite.close();
