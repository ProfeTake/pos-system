// Wrapper centralizado para peticiones al backend.
// No modifica UX/UI: reemplazará uso directo de fetch gradualmente.
// - Usa `VITE_API_BASE` si está definido; fallback a http://localhost:3002
// - Adjunta Authorization si existe token en sessionStorage/localStorage
// - Manejo básico de errores y parse JSON seguro
import { isDemoMode } from "./demo";
import { getDemoResponse } from "./demo/router";

export const API_BASE: string =
  (import.meta as any)?.env?.VITE_API_BASE || 
  (import.meta.env.PROD ? "" : "http://localhost:3002");

// En producción se sirve desde el mismo dominio, no se necesita path ofuscado
const API_PATH = '';
const API_KEY = import.meta.env.VITE_API_KEY || 'dev-key';

function getStoredToken(): string | null {
  // Prioridad: sessionStorage luego localStorage (alineado con auth-context)
  try {
    return (
      sessionStorage.getItem("auth_token") || localStorage.getItem("auth_token")
    );
  } catch {
    return null;
  }
}

export interface ApiError extends Error {
  status?: number;
  payload?: any;
  code?: string;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  // ── Modo Demo: interceptar todas las llamadas de negocio ──
  if (isDemoMode()) {
    // Extraer el path relativo sin el dominio si viene como URL absoluta
    let apiPath = path;
    try {
      if (path.startsWith("http")) {
        apiPath = new URL(path).pathname;
      }
    } catch {}
    const mockResult = getDemoResponse(apiPath, init.method ?? "GET", init.body);
    if (mockResult !== null) {
      return new Response(JSON.stringify(mockResult.data), {
        status: mockResult.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    // Si mockResult es null → ruta de auth, dejar pasar al backend real
  }

  // Construir URL con ruta ofuscada en producción
  const basePath = path.startsWith("http://") || path.startsWith("https://")
    ? path
    : `${API_BASE}${API_PATH}${path.startsWith("/") ? path : `/${path}`}`;
  
  const url = basePath;
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(init.headers as any),
  };
  
  // Añadir API Key para seguridad adicional
  if (import.meta.env.PROD) {
    headers['X-API-Key'] = API_KEY;
  }
  
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  // Asegurar Content-Type si body es objeto
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }
  const finalInit: RequestInit = { ...init, headers };
  const res = await fetch(url, finalInit);
  return res;
}

export async function apiFetchJSON<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await apiFetch(path, init);
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    // Manejo silencioso de 404 para analíticas (devolver objeto marcador)
    if (res.status === 404) {
      return { notFound: true } as T;
    }
    const err: ApiError = new Error(
      data?.error || data?.message || `HTTP ${res.status}`
    );
    err.status = res.status;
    err.payload = data;
    err.code = data?.code;
    throw err;
  }

  // Notify success
  window.dispatchEvent(new CustomEvent("backend:status", { detail: { online: true } }));

  return data as T;
}

// Interceptor para errores de red (fetch fallido)
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  try {
    const res = await originalFetch(...args);
    return res;
  } catch (err) {
    // Si es error de red (no hay conexión al backend), notificar
    window.dispatchEvent(new CustomEvent("backend:status", { detail: { online: false } }));
    throw err;
  }
};

// Pequeño helper para POST JSON
export function postJSON<T = any>(
  path: string,
  body: any,
  init: RequestInit = {}
): Promise<T> {
  return apiFetchJSON<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
    ...init,
  });
}

// DELETE sencillo
export function deleteJSON<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  return apiFetchJSON<T>(path, { method: "DELETE", ...init });
}

// PUT sencillo
export function putJSON<T = any>(
  path: string,
  body: any,
  init: RequestInit = {}
): Promise<T> {
  return apiFetchJSON<T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
    ...init,
  });
}
