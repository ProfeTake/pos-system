// Utilidades de horario operacional (Chile)
// Ahora soporta configuración dinámica desde backend (/api/settings businessHours)
// Fallback por defecto si no hay configuración (horario real del negocio):
// - Lun–Jue: 12:37 → 01:00 am (día siguiente)
// - Vie–Sáb: 12:00 → 03:00 am (día siguiente)
// - Dom:     12:00 → 01:00 am (día siguiente)

import { apiFetchJSON } from "../lib/api";

function setTime(d: Date, h: number, m: number) {
  const x = new Date(d);
  x.setHours(h, m, 0, 0);
  return x;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function dayIdx(d: Date) {
  return d.getDay(); // 0=Domingo, 1=Lunes, ... 5=Viernes, 6=Sábado
}

export type OperationalWindow = {
  open: Date;
  close: Date;
  isFridayWindow: boolean;
};

type BusinessHoursSetting = {
  openingHour: number;
  openingMinute: number;
  closeMinutesByWeekday: Record<string, number>; // legado: minutos después de 00:00 del día siguiente
};
type BHDay = {
  open: boolean;
  openTime: string;
  closeTime: string;
  closeNextDay: boolean;
};
type BusinessHoursV2 = { week: Record<string, BHDay> };

let _cachedSettings: {
  businessHours?: BusinessHoursSetting;
  businessHoursV2?: BusinessHoursV2;
} | null = null;
let _lastFetch = 0;
const SETTINGS_TTL_MS = 60_000; // 1 min

async function loadSettingsIfNeeded(): Promise<void> {
  const now = Date.now();
  if (_cachedSettings && now - _lastFetch < SETTINGS_TTL_MS) return;
  try {
    try {
      // Usar backend directo para evitar problemas de cors/proxy en dev
      _cachedSettings = await apiFetchJSON("/api/settings");
      _lastFetch = now;
    } catch {
      // ignore errors
    }
  } catch {
    // mantener caché anterior o null
  }
}

export async function refreshBusinessHoursCache() {
  _lastFetch = 0;
  await loadSettingsIfNeeded();
}

// Calcula ventana operacional anclada en la fecha base (inicio 10:00 de esa fecha, cierre según reglas al día siguiente)
export function windowForBaseDay(base: Date): OperationalWindow {
  const baseDay = new Date(base);
  baseDay.setHours(0, 0, 0, 0);
  const d = dayIdx(baseDay);

  // Primero intentamos V2
  const v2 = _cachedSettings?.businessHoursV2 as BusinessHoursV2 | undefined;
  if (v2?.week) {
    const row: BHDay | undefined = v2.week[String(d)];
    // Horario real del negocio por día de la semana
    const dailyFallback: Record<number, BHDay> = {
      0: { open: true, openTime: "12:00", closeTime: "01:00", closeNextDay: true }, // Domingo
      1: { open: true, openTime: "12:37", closeTime: "01:00", closeNextDay: true }, // Lunes
      2: { open: true, openTime: "12:37", closeTime: "01:00", closeNextDay: true }, // Martes
      3: { open: true, openTime: "12:37", closeTime: "01:00", closeNextDay: true }, // Miércoles
      4: { open: true, openTime: "12:37", closeTime: "01:00", closeNextDay: true }, // Jueves
      5: { open: true, openTime: "12:00", closeTime: "03:00", closeNextDay: true }, // Viernes
      6: { open: true, openTime: "12:00", closeTime: "03:00", closeNextDay: true }, // Sábado
    };
    const cfg = row ?? dailyFallback[d] ?? dailyFallback[1];
    const [oh, om] = (cfg.openTime || (d === 5 || d === 6 ? "12:00" : d === 0 ? "12:00" : "12:37"))
      .split(":")
      .map((x) => parseInt(x || "0", 10));
    const [ch, cm] = (cfg.closeTime || (d === 5 || d === 6 ? "03:00" : "01:00"))
      .split(":")
      .map((x) => parseInt(x || "0", 10));
    const open = setTime(baseDay, oh, om);
    const closeBase = cfg.closeNextDay ? addDays(baseDay, 1) : baseDay;
    const close = setTime(closeBase, ch, cm);
    return { open, close, isFridayWindow: d === 5 };
  }

  // Fallback legacy
  const conf: BusinessHoursSetting = ((): BusinessHoursSetting => {
    const def: BusinessHoursSetting = {
      openingHour: 12,
      openingMinute: 0,
      closeMinutesByWeekday: {
        // minutos después de 00:00 del día siguiente
        // Dom(0):      01:00 => 60 min
        // Lun(1)–Jue(4): 01:00 => 60 min  (apertura real 12:37 — legacy no diferencia)
        // Vie(5)–Sáb(6): 03:00 => 180 min
        "0": 60,
        "1": 60,
        "2": 60,
        "3": 60,
        "4": 60,
        "5": 180,
        "6": 180,
      },
    };
    const s = _cachedSettings?.businessHours;
    if (!s) return def;
    return {
      ...def,
      ...s,
      closeMinutesByWeekday: {
        ...def.closeMinutesByWeekday,
        ...(s.closeMinutesByWeekday || {}),
      },
    };
  })();
  const open = setTime(baseDay, conf.openingHour, conf.openingMinute);
  const next = addDays(baseDay, 1);
  const mins = conf.closeMinutesByWeekday[String(d)] ?? 90;
  const close = setTime(next, Math.floor(mins / 60), mins % 60);
  return { open, close, isFridayWindow: d === 5 };
}

// Devuelve la ventana operacional vigente para "ahora" (puede ser la de hoy o la de ayer si aún corre post medianoche)
export function getOperationalWindow(now = new Date()): OperationalWindow {
  const today = windowForBaseDay(now);
  if (now >= today.open && now < today.close) return today;
  // Considerar ventana de ayer si ahora es antes de apertura pero podría estar en la ventana de ayer (post medianoche)
  const yest = windowForBaseDay(addDays(now, -1));
  if (now >= yest.open && now < yest.close) return yest;
  // Por defecto, devolver la de hoy
  return today;
}

export function isWithinOperationalHours(now = new Date()): boolean {
  const w = getOperationalWindow(now);
  return now >= w.open && now < w.close;
}

export function getTimeUntilClose(now = new Date()): number {
  const w = getOperationalWindow(now);
  if (now >= w.close) return 0;
  if (now < w.open) return 0;
  return w.close.getTime() - now.getTime();
}

export function getNextOpenTime(now = new Date()): Date {
  const w = getOperationalWindow(now);
  if (now < w.open) return w.open;
  // Si estamos dentro o después de cerrar, próxima apertura es el día base siguiente a las 10:00
  const baseNext = addDays(w.open, 1);
  // Intentar v2 para extraer hora de apertura del siguiente día
  const v2 = _cachedSettings?.businessHoursV2 as BusinessHoursV2 | undefined;
  if (v2?.week) {
    const nextDayIdx = dayIdx(baseNext);
    const row = v2.week[String(nextDayIdx)];
    const openStr = row?.openTime || "10:00";
    const [h, m] = openStr.split(":").map((x) => parseInt(x || "0", 10));
    return setTime(baseNext, h, m);
  }
  // Fallback legacy
  const conf: BusinessHoursSetting = ((): BusinessHoursSetting => {
    const def: BusinessHoursSetting = {
      openingHour: 10,
      openingMinute: 0,
      closeMinutesByWeekday: {
        "0": 90,
        "1": 90,
        "2": 90,
        "3": 90,
        "4": 90,
        "5": 210,
        "6": 90,
      },
    };
    const s = _cachedSettings?.businessHours;
    if (!s) return def;
    return {
      ...def,
      ...s,
      closeMinutesByWeekday: {
        ...def.closeMinutesByWeekday,
        ...(s.closeMinutesByWeekday || {}),
      },
    };
  })();
  return setTime(baseNext, conf.openingHour, conf.openingMinute);
}

export function getCloseTime(now = new Date()): Date {
  return getOperationalWindow(now).close;
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Detecta si estamos en un nuevo turno respecto a una sesión previa.
 * Un "nuevo turno" ocurre cuando:
 * 1. La hora actual está dentro de una ventana operacional (turno)
 * 2. Esa ventana operacional es diferente a la de la sesión previa
 * 
 * @param previousSessionOpenTime - Fecha/hora de apertura de la sesión previa
 * @param now - Fecha actual (por defecto Date.now())
 * @returns { isNewShift: boolean, currentWindow: OperationalWindow, previousWindow: OperationalWindow | null }
 */
export function detectNewShift(
  previousSessionOpenTime: Date | string | null,
  now = new Date()
): {
  isNewShift: boolean;
  currentWindow: OperationalWindow;
  previousWindow: OperationalWindow | null;
  reason?: string;
} {
  const currentWindow = getOperationalWindow(now);
  
  // Si no hay sesión previa, siempre es nuevo turno
  if (!previousSessionOpenTime) {
    return {
      isNewShift: true,
      currentWindow,
      previousWindow: null,
      reason: "No hay sesión previa",
    };
  }

  const prevTime = typeof previousSessionOpenTime === "string"
    ? new Date(previousSessionOpenTime)
    : previousSessionOpenTime;

  const previousWindow = getOperationalWindow(prevTime);

  // Comparamos las ventanas operacionales por su fecha de apertura
  // Si la apertura actual es diferente de la apertura anterior, es nuevo turno
  const sameShift = currentWindow.open.getTime() === previousWindow.open.getTime();

  return {
    isNewShift: !sameShift,
    currentWindow,
    previousWindow,
    reason: sameShift 
      ? "Mismo turno operativo"
      : `Turno cambiado: anterior ${formatTime(previousWindow.open)}, actual ${formatTime(currentWindow.open)}`,
  };
}

/**
 * Verifica si la hora actual ha cruzado al siguiente turno operacional
 * basado en la configuración de horarios.
 * 
 * @param windowClose - Hora de cierre de la sesión actual
 * @param now - Fecha actual
 * @returns true si estamos en un nuevo turno (después del cierre y dentro de nueva ventana)
 */
export function hasShiftChanged(
  windowClose: Date | string | null,
  now = new Date()
): boolean {
  if (!windowClose) return false;
  
  const closeTime = typeof windowClose === "string" 
    ? new Date(windowClose) 
    : windowClose;
  
  // Si aún no hemos llegado al cierre, no hay cambio de turno
  if (now < closeTime) return false;
  
  // Obtenemos la ventana actual
  const currentWindow = getOperationalWindow(now);
  
  // Si estamos dentro de una nueva ventana operacional (después del cierre anterior),
  // significa que cambió el turno
  return now >= currentWindow.open && now < currentWindow.close;
}

// Opcional: precargar settings al importar en cliente
if (typeof window !== "undefined") {
  loadSettingsIfNeeded();
}
