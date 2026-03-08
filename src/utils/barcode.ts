export type BarcodeFormat = "EAN-13" | "UPC-A" | "EAN-8" | "ITF-14" | "UNKNOWN";

/**
 * Calcula el dígito de verificación EAN-8.
 * Pesos: posiciones pares (0-indexed) ×3, impares ×1.
 */
export function computeEan8CheckDigit(d7: string): number {
  if (!/^\d{7}$/.test(d7)) throw new Error("Se esperan 7 dígitos");
  const digits = d7.split("").map(Number);
  const sum = digits.reduce(
    (acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1),
    0
  );
  return (10 - (sum % 10)) % 10;
}

export function isValidEan8(code: string): boolean {
  if (!/^\d{8}$/.test(code)) return false;
  const check = computeEan8CheckDigit(code.slice(0, 7));
  return check === Number(code[7]);
}

export function computeEan13CheckDigit(d12: string): number {
  if (!/^\d{12}$/.test(d12)) throw new Error("Se esperan 12 dígitos");
  const digits = d12.split("").map(Number);
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  const check = computeEan13CheckDigit(code.slice(0, 12));
  return check === Number(code[12]);
}

export function computeUpcACheckDigit(d11: string): number {
  if (!/^\d{11}$/.test(d11)) throw new Error("Se esperan 11 dígitos");
  const digits = d11.split("").map(Number);
  const sumOdd = digits
    .filter((_, i) => i % 2 === 0)
    .reduce((a, b) => a + b, 0);
  const sumEven = digits
    .filter((_, i) => i % 2 === 1)
    .reduce((a, b) => a + b, 0);
  const sum = 3 * sumOdd + sumEven;
  return (10 - (sum % 10)) % 10;
}

export function isValidUpcA(code: string): boolean {
  if (!/^\d{12}$/.test(code)) return false;
  const check = computeUpcACheckDigit(code.slice(0, 11));
  return check === Number(code[11]);
}

export function upcAtoEan13(upc: string): string {
  if (!isValidUpcA(upc)) throw new Error("UPC-A inválido");
  return "0" + upc;
}

export function normalizeBarcode(raw: string): {
  format: BarcodeFormat;
  gtin13: string | null;
} {
  const code = (raw || "").replace(/\D/g, "");
  if (/^\d{13}$/.test(code) && isValidEan13(code))
    return { format: "EAN-13", gtin13: code };
  if (/^\d{12}$/.test(code) && isValidUpcA(code))
    return { format: "UPC-A", gtin13: upcAtoEan13(code) };
  if (/^\d{8}$/.test(code) && isValidEan8(code))
    return { format: "EAN-8", gtin13: null };
  if (/^\d{14}$/.test(code)) return { format: "ITF-14", gtin13: null };
  return { format: "UNKNOWN", gtin13: null };
}
