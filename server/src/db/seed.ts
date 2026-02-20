import { db } from "./index";
import { users } from "./schema";
import { hashPassword } from "../utils/password";

async function seed() {
  console.log("Seeding database...");

  const passwordHash = await hashPassword("punto123");

  try {
    await db.insert(users).values({
      username: "punto3",
      passwordHash,
      fullName: "Punto 3",
      role: "admin",
    });
    console.log("Default user created: punto3 / punto123");
  } catch (e) {
    console.log("User already exists or error:", e);
  }

  console.log("Seeding complete.");
}

seed();
