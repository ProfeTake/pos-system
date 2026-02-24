/**
 * Script para listar usuarios y resetear contraseña de superadmin
 * MySQL version
 */

import * as bcrypt from "bcryptjs";
import { db } from "../db";
import { users } from "../db/schema";
import { eq, or } from "drizzle-orm";

async function main() {
  console.log("👥 Usuarios en la base de datos:\n");

  const allUsers = await db.select().from(users);

  if (allUsers.length === 0) {
    console.log("   No hay usuarios registrados");
  } else {
    allUsers.forEach((user) => {
      console.log(`   ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email || "N/A"}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Nombre: ${user.fullName}`);
      console.log(`   Activo: ${user.active ? "Sí" : "No"}`);
      console.log("");
    });
  }

  // Buscar superadmin
  const [superadmin] = await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.username, "superadmin"),
        eq(users.role, "superadmin")
      )
    )
    .limit(1);

  if (superadmin) {
    console.log(
      "🔑 ¿Resetear contraseña de superadmin? (será: superadmin123)"
    );
    console.log("   Usuario encontrado:", superadmin.username);

    // Resetear contraseña
    const newPassword = "superadmin123";
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    await db
      .update(users)
      .set({ passwordHash: hashedPassword })
      .where(eq(users.id, superadmin.id));

    console.log("\n✅ Contraseña reseteada exitosamente!");
    console.log("\n📋 Credenciales de superadmin:");
    console.log(`   Username: ${superadmin.username}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   Role: ${superadmin.role}`);
  } else {
    console.log("⚠️  No se encontró usuario superadmin");
    console.log("💡 Creando usuario superadmin...");

    const username = "superadmin";
    const password = "superadmin123";
    const hashedPassword = bcrypt.hashSync(password, 10);

    await db.insert(users).values({
      username,
      passwordHash: hashedPassword,
      role: "superadmin",
      fullName: "Super Administrator",
      active: true,
    });

    console.log("\n✅ Usuario superadmin creado!");
    console.log("\n📋 Credenciales:");
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: superadmin`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
