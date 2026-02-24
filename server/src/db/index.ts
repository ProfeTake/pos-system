import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const databaseUrl =
  process.env.DATABASE_URL || "mysql://root:root@localhost:3306/pos";

const pool = mysql.createPool({
  uri: databaseUrl,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Usar timezone local (= Chile via process.env.TZ = 'America/Santiago')
  // para serialización/deserialización de Date en mysql2.
  timezone: "local",
});

// Sincronizar la timezone de la SESIÓN MySQL con el offset actual de Chile.
// Esto asegura que funciones SQL como HOUR(), DATE() retornen hora chilena.
// Se calcula dinámicamente para manejar cambios de horario de verano (DST).
(pool as any).pool.on("connection", (connection: any) => {
  const now = new Date();
  const offsetMin = now.getTimezoneOffset(); // Con TZ=Chile, refleja offset correcto
  const sign = offsetMin <= 0 ? "+" : "-";
  const absMin = Math.abs(offsetMin);
  const h = String(Math.floor(absMin / 60)).padStart(2, "0");
  const m = String(absMin % 60).padStart(2, "0");
  connection.query(`SET time_zone='${sign}${h}:${m}'`);
});

export const db = drizzle(pool, { schema, mode: "default" });
