/**
 * Script: seed:hours
 * Inserts/updates the businessHoursV2 setting in the database with the real
 * operating schedule of the store.
 *
 * Schedule:
 *   Mon–Thu  (1-4): 12:37 → 01:00 AM next day
 *   Fri–Sat  (5-6): 12:00 → 03:00 AM next day
 *   Sun      (0)  : 12:00 → 01:00 AM next day
 *
 * Run via: npm run db:seed:hours  (in /server)
 */

import { db } from "../db";
import { settings } from "../db/schema";
import { eq, and } from "drizzle-orm";

const TENANT_ID = null; // Single-tenant: no tenantId

const businessHoursV2 = {
  week: {
    "0": { open: true, openTime: "12:00", closeTime: "01:00", closeNextDay: true },  // Domingo
    "1": { open: true, openTime: "12:37", closeTime: "01:00", closeNextDay: true },  // Lunes
    "2": { open: true, openTime: "12:37", closeTime: "01:00", closeNextDay: true },  // Martes
    "3": { open: true, openTime: "12:37", closeTime: "01:00", closeNextDay: true },  // Miércoles
    "4": { open: true, openTime: "12:37", closeTime: "01:00", closeNextDay: true },  // Jueves
    "5": { open: true, openTime: "12:00", closeTime: "03:00", closeNextDay: true },  // Viernes
    "6": { open: true, openTime: "12:00", closeTime: "03:00", closeNextDay: true },  // Sábado
  },
};

async function seedBusinessHours() {
  console.log("🕐 Seeding business hours (businessHoursV2)...");

  try {
    const now = new Date();

    // Check if it already exists
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "businessHoursV2"));

    if (existing.length > 0) {
      await db
        .update(settings)
        .set({
          value: JSON.stringify(businessHoursV2) as any,
          updatedAt: now,
        })
        .where(eq(settings.key, "businessHoursV2"));
      console.log("✅ businessHoursV2 updated successfully.");
    } else {
      await db.insert(settings).values({
        key: "businessHoursV2",
        tenantId: TENANT_ID as any,
        value: JSON.stringify(businessHoursV2) as any,
        updatedAt: now,
      });
      console.log("✅ businessHoursV2 inserted successfully.");
    }

    console.log("\nSchedule saved:");
    console.log("  Lun–Jue : 12:37 → 01:00 AM (día siguiente)");
    console.log("  Vie–Sáb : 12:00 → 03:00 AM (día siguiente)");
    console.log("  Dom     : 12:00 → 01:00 AM (día siguiente)");
  } catch (err) {
    console.error("❌ Error seeding business hours:", err);
    process.exit(1);
  }

  process.exit(0);
}

seedBusinessHours();
