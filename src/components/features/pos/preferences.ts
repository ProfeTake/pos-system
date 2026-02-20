export const PRINTER_LS_KEY = "pos.printer.name";
export const DEFAULT_PRINTER_NAME = "POS-80C";

export function getPreferredPrinter(): string | null {
  try {
    const saved = localStorage.getItem(PRINTER_LS_KEY);
    return saved || DEFAULT_PRINTER_NAME;
  } catch {
    return DEFAULT_PRINTER_NAME;
  }
}

export function setPreferredPrinter(name: string | null) {
  try {
    if (!name) localStorage.removeItem(PRINTER_LS_KEY);
    else localStorage.setItem(PRINTER_LS_KEY, name);
  } catch {
    // ignore
  }
}
