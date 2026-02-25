/**
 * Crea el usuario Demo en la base de datos (solo usuario, sin datos de negocio).
 * Los datos de la demo se sirven desde fixtures de JavaScript en el frontend.
 * Ejecutar con: npx tsx src/scripts/seed-demo.ts
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { db } from "../db";
import { users } from "../db/schema";
import { hashPassword } from "../utils/password";
import { eq } from "drizzle-orm";

async function seedDemo() {
  console.log("🎭 Creando usuario Demo...\n");

  const username = "demo";
  const password = "demo";

  // Verificar si ya existe
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.username, username));

  if (existing.length > 0) {
    console.log("✅ El usuario 'demo' ya existe en la base de datos.");
    console.log("   Username: demo");
    console.log("   Password: demo");
    process.exit(0);
  }

  const passwordHash = await hashPassword(password);

  await db.insert(users).values({
    username,
    passwordHash,
    role: "vendedor",
    fullName: "Usuario Demo",
  });

  console.log("✅ Usuario Demo creado exitosamente:");
  console.log("   Username: demo");
  console.log("   Password: demo");
  console.log("   Rol:      vendedor");
  console.log("\n⚠️  IMPORTANTE: Este usuario sirve datos ficticios desde JavaScript.");
  console.log("   No accede ni modifica datos reales de la base de datos.\n");

  process.exit(0);
}

seedDemo().catch((err) => {
  console.error("Error creando usuario demo:", err);
  process.exit(1);
});
