/**
 * Script para insertar datos ficticios en la base de datos (SOLO MODO EJEMPLO)
 * Ejecutar con: npx tsx src/scripts/seed.ts
 * Seguridad: Requiere `SAMPLE_DATA=true` en variables de entorno para evitar correr en producción.
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

if (process.env.SAMPLE_DATA !== "true") {
  console.error(
    "Abortado: este seed carga datos de EJEMPLO. Establece SAMPLE_DATA=true para ejecutarlo."
  );
  process.exit(1);
}

import { db } from "../db";
import {
  users,
  products,
  sales,
  saleItems,
  cashSessions,
  cashMovements,
  promotions,
  auditLog,
} from "../db/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Iniciando seed de datos ficticios...\n");

  // ============== USUARIOS ==============
  console.log("👤 Creando usuarios...");
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const existingUsers = db.select().from(users).all();
  if (existingUsers.length === 0) {
    db.insert(users).values([
      {
        username: "admin",
        passwordHash: hashedPassword,
        role: "admin",
        fullName: "Administrador Principal",
      },
      {
        username: "vendedor1",
        passwordHash: hashedPassword,
        role: "vendedor",
        fullName: "Juan Pérez",
      },
      {
        username: "vendedor2",
        passwordHash: hashedPassword,
        role: "vendedor",
        fullName: "María González",
      },
    ]).run();
  }
  const allUsers = db.select().from(users).all();
  console.log(`   ✓ ${allUsers.length} usuarios\n`);

  // ============== PRODUCTOS ==============
  console.log("📦 Creando productos...");
  const existingProducts = db.select().from(products).all();
  if (existingProducts.length === 0) {
    const productData = [
      // Cervezas
      {
        name: "Cristal 1L",
        category: "Cervezas",
        stock: 48,
        minStock: 12,
        price: 1500,
        cost: 1000,
        marginPct: 50,
        barCode: "7801234567001",
        ml: 1000,
      },
      {
        name: "Escudo 1L",
        category: "Cervezas",
        stock: 36,
        minStock: 12,
        price: 1400,
        cost: 950,
        marginPct: 47,
        barCode: "7801234567002",
        ml: 1000,
      },
      {
        name: "Kunstmann Torobayo",
        category: "Cervezas",
        stock: 24,
        minStock: 6,
        price: 2500,
        cost: 1800,
        marginPct: 39,
        barCode: "7801234567003",
        ml: 500,
      },
      {
        name: "Corona 355ml",
        category: "Cervezas",
        stock: 48,
        minStock: 12,
        price: 1800,
        cost: 1200,
        marginPct: 50,
        barCode: "7801234567004",
        ml: 355,
      },
      {
        name: "Heineken 330ml",
        category: "Cervezas",
        stock: 36,
        minStock: 12,
        price: 1900,
        cost: 1300,
        marginPct: 46,
        barCode: "7801234567005",
        ml: 330,
      },
      // Vinos
      {
        name: "Casillero del Diablo Cabernet",
        category: "Vinos",
        stock: 18,
        minStock: 6,
        price: 5500,
        cost: 3800,
        marginPct: 45,
        barCode: "7801234567010",
        ml: 750,
      },
      {
        name: "Concha y Toro Merlot",
        category: "Vinos",
        stock: 24,
        minStock: 6,
        price: 4200,
        cost: 2900,
        marginPct: 45,
        barCode: "7801234567011",
        ml: 750,
      },
      {
        name: "Santa Rita 120 Carmenere",
        category: "Vinos",
        stock: 15,
        minStock: 6,
        price: 3800,
        cost: 2500,
        marginPct: 52,
        barCode: "7801234567012",
        ml: 750,
      },
      {
        name: "Gato Negro Sauvignon Blanc",
        category: "Vinos",
        stock: 20,
        minStock: 6,
        price: 3200,
        cost: 2100,
        marginPct: 52,
        barCode: "7801234567013",
        ml: 750,
      },
      // Destilados
      {
        name: "Pisco Mistral 35°",
        category: "Destilados",
        stock: 12,
        minStock: 4,
        price: 8500,
        cost: 5800,
        marginPct: 47,
        barCode: "7801234567020",
        ml: 750,
      },
      {
        name: "Pisco Capel 40°",
        category: "Destilados",
        stock: 10,
        minStock: 4,
        price: 9200,
        cost: 6200,
        marginPct: 48,
        barCode: "7801234567021",
        ml: 750,
      },
      {
        name: "Ron Barceló Añejo",
        category: "Destilados",
        stock: 8,
        minStock: 3,
        price: 12000,
        cost: 8500,
        marginPct: 41,
        barCode: "7801234567022",
        ml: 750,
      },
      {
        name: "Vodka Absolut",
        category: "Destilados",
        stock: 10,
        minStock: 4,
        price: 11500,
        cost: 8000,
        marginPct: 44,
        barCode: "7801234567023",
        ml: 750,
      },
      {
        name: "Whisky Johnnie Walker Red",
        category: "Destilados",
        stock: 6,
        minStock: 2,
        price: 15000,
        cost: 10500,
        marginPct: 43,
        barCode: "7801234567024",
        ml: 750,
      },
      // Bebidas
      {
        name: "Coca-Cola 1.5L",
        category: "Bebidas",
        stock: 30,
        minStock: 10,
        price: 1800,
        cost: 1200,
        marginPct: 50,
        barCode: "7801234567030",
        ml: 1500,
      },
      {
        name: "Sprite 1.5L",
        category: "Bebidas",
        stock: 24,
        minStock: 8,
        price: 1700,
        cost: 1100,
        marginPct: 55,
        barCode: "7801234567031",
        ml: 1500,
      },
      {
        name: "Agua Mineral Cachantun 1.6L",
        category: "Bebidas",
        stock: 36,
        minStock: 12,
        price: 1200,
        cost: 700,
        marginPct: 71,
        barCode: "7801234567032",
        ml: 1600,
      },
      {
        name: "Red Bull 250ml",
        category: "Bebidas",
        stock: 24,
        minStock: 6,
        price: 2500,
        cost: 1800,
        marginPct: 39,
        barCode: "7801234567033",
        ml: 250,
      },
      // Snacks
      {
        name: "Papas Fritas Lays 150g",
        category: "Snacks",
        stock: 20,
        minStock: 8,
        price: 1800,
        cost: 1200,
        marginPct: 50,
        barCode: "7801234567040",
        ml: 0,
        measureUnit: "g",
      },
      {
        name: "Ramitas 200g",
        category: "Snacks",
        stock: 15,
        minStock: 6,
        price: 1500,
        cost: 950,
        marginPct: 58,
        barCode: "7801234567041",
        ml: 0,
        measureUnit: "g",
      },
      {
        name: "Maní Salado 180g",
        category: "Snacks",
        stock: 25,
        minStock: 10,
        price: 1200,
        cost: 750,
        marginPct: 60,
        barCode: "7801234567042",
        ml: 0,
        measureUnit: "g",
      },
      // Cigarrillos
      {
        name: "Marlboro Rojo 20",
        category: "Cigarrillos",
        stock: 30,
        minStock: 10,
        price: 5500,
        cost: 4200,
        marginPct: 31,
        barCode: "7801234567050",
        ml: 0,
        measureUnit: "unidad",
      },
      {
        name: "Kent Blue 20",
        category: "Cigarrillos",
        stock: 20,
        minStock: 8,
        price: 5200,
        cost: 4000,
        marginPct: 30,
        barCode: "7801234567051",
        ml: 0,
        measureUnit: "unidad",
      },
      // Hielo
      {
        name: "Bolsa de Hielo 2kg",
        category: "Hielo",
        stock: 15,
        minStock: 5,
        price: 1500,
        cost: 800,
        marginPct: 88,
        barCode: "7801234567060",
        ml: 0,
        measureUnit: "kg",
      },
    ];
    db.insert(products).values(productData).run();
  }
  const allProducts = db.select().from(products).all();
  console.log(`   ✓ ${allProducts.length} productos\n`);

  // ============== SESIONES DE CAJA ==============
  console.log("💵 Creando sesiones de caja...");
  const existingSessions = db.select().from(cashSessions).all();
  if (existingSessions.length === 0) {
    const now = new Date();
    const sessions = [];

    // Últimos 7 días de sesiones
    for (let i = 6; i >= 0; i--) {
      const openDate = new Date(now);
      openDate.setDate(openDate.getDate() - i);
      openDate.setHours(10, 0, 0, 0);

      const closeDate = new Date(openDate);
      closeDate.setHours(22, 0, 0, 0);

      const initialCash = 50000;
      const finalCash =
        initialCash + Math.floor(Math.random() * 150000) + 50000;

      sessions.push({
        userId: allUsers[1].id, // vendedor1
        openTime: openDate,
        closeTime: i === 0 ? null : closeDate, // Hoy queda abierta
        initialCash,
        finalCash: i === 0 ? null : finalCash,
        declaredCash:
          i === 0 ? null : finalCash - Math.floor(Math.random() * 2000),
        difference: i === 0 ? null : Math.floor(Math.random() * 2000) - 1000,
        notes: i === 0 ? null : "Turno normal",
        windowClose: closeDate,
      });
    }
    db.insert(cashSessions).values(sessions).run();
  }
  const allSessions = db.select().from(cashSessions).all();
  console.log(`   ✓ ${allSessions.length} sesiones de caja\n`);

  // ============== VENTAS ==============
  console.log("🛒 Creando ventas...");
  const existingSales = db.select().from(sales).all();
  if (existingSales.length === 0) {
    const now = new Date();
    const paymentMethods = ["cash", "debit", "credit", "transfer"];
    const customers = [
      "Cliente Anónimo",
      "Juan",
      "María",
      "Pedro",
      "Ana",
      "Carlos",
      null,
    ];
    const salesData = [];

    // Crear 100 ventas en los últimos 30 días
    for (let i = 0; i < 100; i++) {
      const saleDate = new Date(now);
      saleDate.setDate(saleDate.getDate() - Math.floor(Math.random() * 30));
      saleDate.setHours(
        Math.floor(Math.random() * 12) + 10,
        Math.floor(Math.random() * 60),
        0,
        0
      );

      const numItems = Math.floor(Math.random() * 4) + 1;
      let total = 0;
      const items = [];

      for (let j = 0; j < numItems; j++) {
        const product =
          allProducts[Math.floor(Math.random() * allProducts.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        const subtotal = product.price * qty;
        total += subtotal;
        items.push({ product, qty, subtotal });
      }

      // 5% de ventas anuladas, 3% devueltas
      const rand = Math.random();
      let status: "completed" | "voided" | "refunded" = "completed";
      if (rand < 0.05) status = "voided";
      else if (rand < 0.08) status = "refunded";

      salesData.push({
        date: saleDate,
        total,
        paymentMethod:
          paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        customerName: customers[Math.floor(Math.random() * customers.length)],
        status,
        voidedAt: status !== "completed" ? saleDate : null,
        voidReason:
          status === "voided"
            ? "Error en la venta"
            : status === "refunded"
            ? "Producto defectuoso"
            : null,
        items,
      });
    }

    // Ordenar por fecha
    salesData.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Insertar ventas y sus items
    for (const sale of salesData) {
      const { id: newSaleId } = db
        .insert(sales)
        .values({
          total: sale.total,
          paymentMethod: sale.paymentMethod,
          customerName: sale.customerName,
          status: sale.status,
          voidedAt: sale.voidedAt,
          voidReason: sale.voidReason,
          createdAt: sale.date,
        })
        .returning()
        .get();

      for (const item of sale.items) {
        db.insert(saleItems).values({
          saleId: newSaleId,
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.qty,
          price: item.product.price,
          subtotal: item.subtotal,
        }).run();
      }
    }
  }
  const allSales = db.select().from(sales).all();
  const allItems = db.select().from(saleItems).all();
  console.log(`   ✓ ${allSales.length} ventas con ${allItems.length} items\n`);

  // ============== MOVIMIENTOS DE CAJA ==============
  console.log("💰 Creando movimientos de caja...");
  const existingMovements = db.select().from(cashMovements).all();
  if (existingMovements.length === 0) {
    const movements: {
      sessionId: number;
      type: "INGRESO" | "EGRESO";
      amount: number;
      reason: string;
    }[] = [];
    for (const session of allSessions) {
      // 1-3 movimientos por sesión
      const numMovements = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < numMovements; i++) {
        const isIngreso = Math.random() > 0.3;
        movements.push({
          sessionId: session.id,
          type: isIngreso ? "INGRESO" : "EGRESO",
          amount: (Math.floor(Math.random() * 10) + 1) * 1000,
          reason: isIngreso
            ? ["Venta adicional", "Pago pendiente", "Propina"][
                Math.floor(Math.random() * 3)
              ]
            : ["Compra insumos", "Vuelto faltante", "Pago proveedor"][
                Math.floor(Math.random() * 3)
              ],
        });
      }
    }
    if (movements.length > 0) {
      db.insert(cashMovements).values(movements).run();
    }
  }
  const allMovements = db.select().from(cashMovements).all();
  console.log(`   ✓ ${allMovements.length} movimientos de caja\n`);

  // ============== PROMOCIONES ==============
  console.log("🎉 Creando promociones...");
  const existingPromos = db.select().from(promotions).all();
  if (existingPromos.length === 0) {
    db.insert(promotions).values([
      {
        name: "2x1 en Cervezas Cristal",
        description: "Lleva 2 Cristal 1L por el precio de 1",
        type: "2x1",
        active: true,
        scope: "product",
        productIds: [
          allProducts.find((p) => p.name.includes("Cristal"))?.id || 1,
        ],
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 semana
        maxUses: 50,
        usedCount: 12,
        bundleQty: 2,
        barcode: "PROMO2X1CRISTAL",
      },
      {
        name: "20% en Vinos",
        description: "Descuento del 20% en toda la categoría de vinos",
        type: "percentage",
        value: 20,
        active: true,
        scope: "category",
        categoryName: "Vinos",
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 semanas
        usedCount: 8,
        barcode: "PROMO20VINOS",
      },
      {
        name: "Happy Hour Destilados",
        description: "$2.000 de descuento en destilados",
        type: "fixed",
        value: 2000,
        active: false,
        scope: "category",
        categoryName: "Destilados",
        minPurchase: 10000,
        usedCount: 25,
      },
      {
        name: "3x2 en Snacks",
        description: "Lleva 3 snacks y paga solo 2",
        type: "3x2",
        active: true,
        scope: "category",
        categoryName: "Snacks",
        bundleQty: 3,
        usedCount: 15,
        barcode: "PROMO3X2SNACKS",
      },
    ]).run();
  }
  const allPromos = db.select().from(promotions).all();
  console.log(`   ✓ ${allPromos.length} promociones\n`);

  // ============== AUDIT LOG ==============
  console.log("📋 Creando registros de auditoría...");
  const existingAudit = db.select().from(auditLog).all();
  if (existingAudit.length === 0) {
    const auditData = [];
    const actions = [
      { action: "auth.login", entity: "user" },
      { action: "sale.create", entity: "sale" },
      { action: "product.update", entity: "product" },
      { action: "cash_session.open", entity: "cash_session" },
      { action: "cash_session.close", entity: "cash_session" },
      { action: "promotion.toggle", entity: "promotion" },
    ];

    const now = new Date();
    for (let i = 0; i < 50; i++) {
      const actionData = actions[Math.floor(Math.random() * actions.length)];
      const user = allUsers[Math.floor(Math.random() * allUsers.length)];
      const date = new Date(now);
      date.setDate(date.getDate() - Math.floor(Math.random() * 7));
      date.setHours(
        Math.floor(Math.random() * 12) + 10,
        Math.floor(Math.random() * 60),
        0,
        0
      );

      auditData.push({
        userId: user.id,
        username: user.username,
        action: actionData.action,
        entity: actionData.entity,
        entityId: Math.floor(Math.random() * 20) + 1,
        details: { ip: "192.168.1." + Math.floor(Math.random() * 255) },
        ipAddress: "192.168.1." + Math.floor(Math.random() * 255),
        createdAt: date,
      });
    }
    db.insert(auditLog).values(auditData).run();
  }
  const allAudit = db.select().from(auditLog).all();
  console.log(`   ✓ ${allAudit.length} registros de auditoría\n`);

  console.log("✅ Seed completado exitosamente!");
  console.log("\n📊 Resumen:");
  console.log(`   - Usuarios: ${allUsers.length}`);
  console.log(`   - Productos: ${allProducts.length}`);
  console.log(`   - Ventas: ${allSales.length}`);
  console.log(`   - Items de venta: ${allItems.length}`);
  console.log(`   - Sesiones de caja: ${allSessions.length}`);
  console.log(`   - Movimientos de caja: ${allMovements.length}`);
  console.log(`   - Promociones: ${allPromos.length}`);
  console.log(`   - Registros de auditoría: ${allAudit.length}`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Error en seed:", err);
  process.exit(1);
});
