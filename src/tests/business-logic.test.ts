// Business Logic Tests
import { describe, test, expect } from "vitest";

// Helper function for calculating estado
function calcularEstado(stock: number, minStock: number): string {
  if (stock <= 0) return "AGOTADO";
  if (stock <= minStock) return "BAJO_STOCK";
  return "DISPONIBLE";
}

describe("Business Logic - Product Estado", () => {
  test("should return BAJO_STOCK when stock <= minStock", () => {
    expect(calcularEstado(3, 5)).toBe("BAJO_STOCK");
    expect(calcularEstado(5, 5)).toBe("BAJO_STOCK");
  });

  test("should return DISPONIBLE when stock > minStock", () => {
    expect(calcularEstado(10, 5)).toBe("DISPONIBLE");
    expect(calcularEstado(6, 5)).toBe("DISPONIBLE");
  });

  test("should return AGOTADO when stock is 0", () => {
    expect(calcularEstado(0, 5)).toBe("AGOTADO");
    expect(calcularEstado(0, 0)).toBe("AGOTADO");
  });

  test("should handle edge cases", () => {
    expect(calcularEstado(1, 0)).toBe("DISPONIBLE");
  });
});

// Cash Balance Calculation Tests
describe("Cash Balance Logic", () => {
  const calculateBalance = (
    openingAmount: number,
    movements: Array<{ amount: number }>
  ) => {
    return openingAmount + movements.reduce((acc, m) => acc + m.amount, 0);
  };

  test("should calculate balance correctly with no movements", () => {
    expect(calculateBalance(50000, [])).toBe(50000);
  });

  test("should calculate balance with positive movements", () => {
    const movements = [{ amount: 10000 }, { amount: 5000 }];
    expect(calculateBalance(50000, movements)).toBe(65000);
  });

  test("should calculate balance with negative movements", () => {
    const movements = [{ amount: -10000 }, { amount: -5000 }];
    expect(calculateBalance(50000, movements)).toBe(35000);
  });

  test("should calculate balance with mixed movements", () => {
    const movements = [
      { amount: 15000 }, // Sale
      { amount: -2000 }, // Withdrawal
      { amount: 8000 }, // Deposit
    ];
    expect(calculateBalance(50000, movements)).toBe(71000);
  });
});

// Stock Validation Tests
describe("Stock Validation", () => {
  const validateStockOperation = (
    currentStock: number,
    requestedQuantity: number
  ) => {
    if (requestedQuantity <= 0) {
      throw new Error("La cantidad debe ser mayor a 0");
    }
    if (requestedQuantity > currentStock) {
      throw new Error("Stock insuficiente");
    }
    return true;
  };

  test("should validate successful stock operation", () => {
    expect(validateStockOperation(10, 5)).toBe(true);
    expect(validateStockOperation(1, 1)).toBe(true);
  });

  test("should reject zero or negative quantities", () => {
    expect(() => validateStockOperation(10, 0)).toThrow(
      "La cantidad debe ser mayor a 0"
    );
    expect(() => validateStockOperation(10, -1)).toThrow(
      "La cantidad debe ser mayor a 0"
    );
  });

  test("should reject insufficient stock", () => {
    expect(() => validateStockOperation(5, 10)).toThrow("Stock insuficiente");
    expect(() => validateStockOperation(0, 1)).toThrow("Stock insuficiente");
  });
});
