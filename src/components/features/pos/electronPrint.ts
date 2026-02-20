// utilidades para impresión nativa vía Electron

export async function listSystemPrinters(): Promise<string[]> {
  try {
    const anyWin = window as any;
    if (!anyWin.desktop?.getPrinters) return [];
    const names: string[] = await anyWin.desktop.getPrinters();
    return Array.isArray(names) ? names : [];
  } catch {
    return [];
  }
}

export interface ElectronPrintOptions {
  deviceName?: string;
  preview?: boolean; // fuerza mostrar ventana sin disparar print automático
}

export async function printReceiptViaElectron(
  html: string,
  deviceNameOrOptions?: string | ElectronPrintOptions
): Promise<boolean> {
  try {
    const anyWin = window as any;
    if (!anyWin.desktop?.printHtml) return false;
    let target: string | undefined;
    let preview = false;
    if (typeof deviceNameOrOptions === "string") {
      target = deviceNameOrOptions.trim();
    } else if (deviceNameOrOptions) {
      target = deviceNameOrOptions.deviceName?.trim();
      preview = Boolean(deviceNameOrOptions.preview);
    }
    // Si se especifica impresora, intentar normalizar nombre con la lista del sistema
    if (target && anyWin.desktop?.getPrinters) {
      try {
        const names: string[] = await anyWin.desktop.getPrinters();
        const found = names.find(
          (n) => n.toLowerCase() === target!.toLowerCase()
        );
        if (found) target = found; // usar nombre real reportado por el sistema
      } catch {}
    }
    try {
      await anyWin.desktop.printHtml(html, { deviceName: target, preview });
      return true;
    } catch (e) {
      console.warn("Fallo impresión silenciosa:", e);
      // Fallback: abrir diálogo del sistema (sin deviceName) para que el usuario seleccione
      try {
        await anyWin.desktop.printHtml(html, { preview });
        return true;
      } catch (err2) {
        console.error("Fallo impresión con diálogo:", err2);
        return false;
      }
    }
  } catch {
    return false;
  }
}

//
