/**
 * Resetea la base de datos SQLite eliminando el archivo.
 * Uso:
 *   npx tsx src/scripts/resetDb.ts --force
 *
 * Seguridad: requiere flag --force para prevenir borrado accidental.
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const args = new Set(process.argv.slice(2));
if (!args.has("--force")) {
  console.error(
    "Abortado: añade --force para confirmar el reseteo de la base de datos."
  );
  process.exit(1);
}

function main() {
  const dbPath =
    process.env.DATABASE_URL || path.resolve(__dirname, "../../db.sqlite");

  if (!fs.existsSync(dbPath)) {
    console.log("No se encontró archivo de base de datos:", dbPath);
    return;
  }

  // Eliminar archivo SQLite y archivos WAL/SHM asociados
  fs.unlinkSync(dbPath);
  console.log(`✔ Eliminado: ${dbPath}`);

  const walPath = dbPath + "-wal";
  if (fs.existsSync(walPath)) {
    fs.unlinkSync(walPath);
    console.log(`✔ Eliminado: ${walPath}`);
  }

  const shmPath = dbPath + "-shm";
  if (fs.existsSync(shmPath)) {
    fs.unlinkSync(shmPath);
    console.log(`✔ Eliminado: ${shmPath}`);
  }

  console.log(
    "\nReseteo completado. Ejecuta `npm run db:push` para recrear las tablas."
  );
}

main();
