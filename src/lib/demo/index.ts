/**
 * Demo Mode — utilidades públicas
 */
const DEMO_FLAG_KEY = "demo_mode";

/** Devuelve `true` si la sesión activa es del usuario Demo. */
export function isDemoMode(): boolean {
  try {
    return sessionStorage.getItem(DEMO_FLAG_KEY) === "1";
  } catch {
    return false;
  }
}

/** Activa el modo demo (llamado tras login exitoso con usuario "demo"). */
export function enableDemoMode(): void {
  try {
    sessionStorage.setItem(DEMO_FLAG_KEY, "1");
  } catch {}
}

/** Desactiva el modo demo (llamado en logout). */
export function disableDemoMode(): void {
  try {
    sessionStorage.removeItem(DEMO_FLAG_KEY);
  } catch {}
}
