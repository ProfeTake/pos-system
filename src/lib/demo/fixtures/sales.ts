import type { Sale } from "@/types";
import { demoProducts } from "./products";

/** Genera ventas ficticias para los últimos N días */
function makeSales(): Sale[] {
  const sales: Sale[] = [];
  const now = new Date(2026, 1, 25); // 25 Feb 2026 (fecha actual del sistema)
  const paymentMethods = ["efectivo", "efectivo", "efectivo", "débito", "crédito", "transbank"];

  // Distribución de ventas por día (promedio 4-8 ventas diarias en 30 días)
  const TOTAL_DAYS = 30;
  let saleId = 1;

  for (let d = TOTAL_DAYS; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);

    // Fines de semana tienen más ventas
    const isWeekend = date.getDay() === 5 || date.getDay() === 6;
    const numSales = isWeekend
      ? 8 + Math.floor(Math.random() * 5) // 8-12
      : 3 + Math.floor(Math.random() * 4); // 3-6

    for (let s = 0; s < numSales; s++) {
      // Hora de la venta (distribución realista: más por la tarde/noche)
      const hourBuckets = [15, 16, 17, 18, 19, 20, 21, 22, 12, 13, 14, 10, 11];
      const hour = hourBuckets[Math.floor(Math.random() * hourBuckets.length)];
      const minute = Math.floor(Math.random() * 60);
      const saleDate = new Date(date);
      saleDate.setHours(hour, minute, 0, 0);

      // Seleccionar 1-4 productos aleatorios con bias hacia los más baratos
      const numItems = 1 + Math.floor(Math.random() * 3);
      const shuffled = [...demoProducts]
        .sort(() => Math.random() - 0.5)
        .slice(0, numItems);

      const items = shuffled.map((product, idx) => {
        const qty = 1 + Math.floor(Math.random() * 3);
        return {
          id: saleId * 10 + idx,
          saleId,
          productId: product.id,
          productName: product.name,
          quantity: qty,
          price: product.price,
          subtotal: product.price * qty,
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
          },
        };
      });

      const total = items.reduce((sum, i) => sum + i.subtotal, 0);
      const paymentMethod =
        paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

      sales.push({
        id: saleId,
        items,
        total,
        date: saleDate,
        paymentMethod,
        status: "completed",
        customerName: undefined,
      });
      saleId++;
    }
  }

  return sales;
}

// Pre-computamos las ventas una sola vez para que sean estables durante la sesión
export const demoSales: Sale[] = makeSales();
