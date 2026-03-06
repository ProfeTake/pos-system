/**
 * Utilidades centralizadas para el manejo de tipos de movimientos de caja.
 *
 * El frontend usa tipos descriptivos (deposit, withdrawal, adjustment, sale)
 * mientras que la BD MySQL tiene un enum estricto: INGRESO | EGRESO.
 *
 * Este mapper normaliza la comunicación en ambas direcciones para evitar
 * que el backend ignore movimientos al calcular el balance.
 */

// Tipos que el frontend puede enviar
export type FrontendMovementType =
  | "sale"
  | "deposit"
  | "withdrawal"
  | "adjustment"
  | "INGRESO"
  | "EGRESO";

// Tipos válidos en la columna enum de MySQL
export type DBMovementType = "INGRESO" | "EGRESO";

// Signo del monto: positivo suma al saldo, negativo resta
export type MovementSign = "positive" | "negative";

interface MovementTypeInfo {
  dbType: DBMovementType;
  sign: MovementSign;
  label: string; // etiqueta en español para UI/prints
}

const TYPE_MAP: Record<string, MovementTypeInfo> = {
  // Tipos del frontend
  deposit: { dbType: "INGRESO", sign: "positive", label: "Ingreso" },
  sale: { dbType: "INGRESO", sign: "positive", label: "Venta" },
  adjustment: { dbType: "INGRESO", sign: "positive", label: "Ajuste" },
  withdrawal: { dbType: "EGRESO", sign: "negative", label: "Retiro" },

  // Tipos legacy de DB (pasan directo)
  INGRESO: { dbType: "INGRESO", sign: "positive", label: "Ingreso" },
  EGRESO: { dbType: "EGRESO", sign: "negative", label: "Egreso" },
};

/**
 * Convierte un tipo de movimiento del frontend al tipo válido de DB.
 * Si el tipo ya es un valor de DB, lo retorna tal cual.
 */
export function toDBType(frontendType: string): DBMovementType {
  const info = TYPE_MAP[frontendType];
  if (!info) {
    console.warn(
      `[cashTypes] Tipo de movimiento desconocido: "${frontendType}", defaulting to INGRESO`
    );
    return "INGRESO";
  }
  return info.dbType;
}

/**
 * Obtiene la información completa de un tipo de movimiento.
 */
export function getTypeInfo(type: string): MovementTypeInfo {
  return (
    TYPE_MAP[type] || { dbType: "INGRESO", sign: "positive", label: type }
  );
}

/**
 * Normaliza el monto según el tipo de movimiento.
 * Asegura que los retiros sean negativos y los ingresos positivos,
 * sin importar lo que envíe el frontend.
 */
export function normalizeAmount(
  amount: number,
  frontendType: string
): number {
  const info = getTypeInfo(frontendType);
  const abs = Math.abs(amount);
  return info.sign === "negative" ? -abs : abs;
}

/**
 * Determina si un monto de movimiento es positivo (entrada de dinero)
 * basándose en el tipo almacenado en DB o enviado por el frontend.
 */
export function isInflow(type: string): boolean {
  const info = TYPE_MAP[type];
  return info ? info.sign === "positive" : true;
}

/**
 * Traduce un tipo de movimiento a su etiqueta en español para la UI.
 */
export function typeLabel(type: string): string {
  return TYPE_MAP[type]?.label || type;
}
