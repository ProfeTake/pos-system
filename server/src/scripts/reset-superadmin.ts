/**
 * Script para listar usuarios y resetear contraseña de superadmin
 */

import * as bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function main() {
  const dbPath =
    process.env.DATABASE_URL || path.resolve(__dirname, "../../db.sqlite");

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");

  console.log("👥 Usuarios en la base de datos:\n");

  const users = db.prepare(
    "SELECT id, username, email, role, full_name, active FROM users"
  ).all() as any[];

  if (users.length === 0) {
    console.log("   No hay usuarios registrados");
  } else {
    users.forEach((user: any) => {
      console.log(`   ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email || "N/A"}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Nombre: ${user.full_name}`);
      console.log(`   Activo: ${user.active ? "Sí" : "No"}`);
      console.log("");
    });
  }

  // Buscar superadmin
  const superadmin = users.find(
    (u: any) => u.username === "superadmin" || u.role === "superadmin"
  );

  if (superadmin) {
    console.log(
      "🔑 ¿Resetear contraseña de superadmin? (será: superadmin123)"
    );
    console.log("   Usuario encontrado:", superadmin.username);

    // Resetear contraseña
    const newPassword = "superadmin123";
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
      hashedPassword,
      superadmin.id
    );

    console.log("\n✅ Contraseña reseteada exitosamente!");
    console.log("\n📋 Credenciales de superadmin:");
    console.log(`   Username: ${superadmin.username}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   Role: ${superadmin.role}`);
  } else {
    console.log("⚠️  No se encontró usuario superadmin");
    console.log("💡 ¿Crear usuario superadmin?");

    const username = "superadmin";
    const password = "superadmin123";
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.prepare(
      `INSERT INTO users (username, password_hash, role, full_name, active)
       VALUES (?, ?, ?, ?, ?)`
    ).run(username, hashedPassword, "superadmin", "Super Administrator", 1);

    console.log("\n✅ Usuario superadmin creado!");
    console.log("\n📋 Credenciales:");
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: superadmin`);
  }

  db.close();
}

main();
