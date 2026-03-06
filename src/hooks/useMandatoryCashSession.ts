import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  getOperationalWindow,
  getCloseTime,
  getNextOpenTime,
  isWithinOperationalHours,
} from "../utils/businessHours";
import { API_BASE, apiFetch, apiFetchJSON, postJSON } from "../lib/api";
import { isDemoMode } from "../lib/demo";

// Fuente de verdad: backend summary. Evitamos manipular localStorage salvo para recordar última apertura.
const LS_KEY = "pos.cash.session.cache";
interface LocalCacheSession {
  openedAt: string;
  openingAmount: number;
  windowOpen?: string;
  windowClose?: string;
}

// Singleton para la conexión SSE - evita múltiples conexiones
let globalEventSource: EventSource | null = null;
let sseListeners: Set<() => void> = new Set();
let sseConnecting = false;
let sseReconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let sseReconnectAttempts = 0;
const SSE_MAX_RECONNECT_ATTEMPTS = 10; // Más intentos para redes móviles inestables
const SSE_BASE_RECONNECT_DELAY = 5000; // 5 segundos base

function connectSSE(onEvent: () => void) {
  sseListeners.add(onEvent);

  // En modo demo no conectamos SSE al backend real
  if (isDemoMode()) return;

  // Si ya hay conexión activa, solo agregamos el listener
  if (globalEventSource?.readyState === EventSource.OPEN) {
    return;
  }

  // Si ya estamos conectando, esperamos
  if (sseConnecting) {
    return;
  }

  // Limpiar timeout de reconexión previo
  if (sseReconnectTimeout) {
    clearTimeout(sseReconnectTimeout);
    sseReconnectTimeout = null;
  }

  sseConnecting = true;

  try {
    globalEventSource = new EventSource(`${API_BASE}/api/events`);

    globalEventSource.addEventListener("cashSessionChanged", () => {
      sseListeners.forEach((fn) => fn());
    });

    globalEventSource.addEventListener("settingsChanged", () => {
      try {
        window.dispatchEvent(new CustomEvent("businessHours:changed"));
      } catch {}
      sseListeners.forEach((fn) => fn());
    });

    globalEventSource.onopen = () => {
      sseConnecting = false;
      sseReconnectAttempts = 0; // Reset en conexión exitosa
    };

    globalEventSource.onerror = () => {
      sseConnecting = false;
      try {
        globalEventSource?.close();
      } catch {}
      globalEventSource = null;

      // Backoff exponencial con límite de intentos
      if (
        sseListeners.size > 0 &&
        sseReconnectAttempts < SSE_MAX_RECONNECT_ATTEMPTS
      ) {
        const delay =
          SSE_BASE_RECONNECT_DELAY * Math.pow(2, sseReconnectAttempts);
        sseReconnectAttempts++;

        sseReconnectTimeout = setTimeout(() => {
          sseReconnectTimeout = null;
          if (sseListeners.size > 0) {
            // Llamar con el primer listener real del set
            const firstListener = sseListeners.values().next().value;
            if (firstListener) connectSSE(firstListener);
          }
        }, Math.min(delay, 60000)); // Máximo 60 segundos
      }
    };
  } catch {
    sseConnecting = false;
  }
}

function disconnectSSE(onEvent: () => void) {
  sseListeners.delete(onEvent);

  // Si no hay más listeners, cerrar la conexión y limpiar
  if (sseListeners.size === 0) {
    if (sseReconnectTimeout) {
      clearTimeout(sseReconnectTimeout);
      sseReconnectTimeout = null;
    }
    if (globalEventSource) {
      try {
        globalEventSource.close();
      } catch {}
      globalEventSource = null;
    }
    sseReconnectAttempts = 0;
  }
}

// ── Recuperación automática del SSE en móvil ─────────────────────────────────
// En dispositivos móviles el SSE se corta al poner la app en segundo plano
// o al pasar por zonas sin señal. Estos listeners reconectan sin recargar.
function handleSSENetworkRestore() {
  // Si no hay conexión activa y hay listeners registrados, reconectar inmediatamente
  if (sseListeners.size > 0 && globalEventSource === null && !sseConnecting) {
    sseReconnectAttempts = 0; // Reset para tener el máximo de intentos disponibles
    if (sseReconnectTimeout) {
      clearTimeout(sseReconnectTimeout);
      sseReconnectTimeout = null;
    }
    const firstListener = sseListeners.values().next().value;
    if (firstListener) connectSSE(firstListener);
  }
}

// Reconectar cuando vuelve la conexión de red (browser event)
if (typeof window !== "undefined") {
  window.addEventListener("online", handleSSENetworkRestore);
}

// Reconectar cuando el usuario vuelve a la pestaña/app (backgrounding en móvil)
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      handleSSENetworkRestore();
    }
  });
}
// ─────────────────────────────────────────────────────────────────────────────

export function useMandatoryCashSession() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LocalCacheSession | null>(null);
  const [version, setVersion] = useState(0);

  // Refs para control de estado
  const fetchingRef = useRef(false);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cargar caché inicial rápido para evitar flash (solo una vez)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.openedAt) setSession(parsed);
      }
    } catch {}

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Sincronización con backend (summary)
  useEffect(() => {
    // Evitar llamadas duplicadas
    if (fetchingRef.current) return;

    // Cancelar petición anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    fetchingRef.current = true;

    (async () => {
      if (!mountedRef.current) return;
      setLoading(true);

      try {
        const v = await apiFetchJSON<any>("/api/cash-session/summary", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!mountedRef.current || controller.signal.aborted) return;

        if (v?.open) {
          const next: LocalCacheSession = {
            openedAt: v.openedAt || v.openTime,
            openingAmount:
              typeof v.openingAmount === "number"
                ? v.openingAmount
                : typeof v.initialCash === "number"
                ? v.initialCash
                : 0,
            windowOpen: v.windowOpen || v.openTime,
            windowClose: v.windowClose,
          };
          setSession(next);
          try {
            localStorage.setItem(LS_KEY, JSON.stringify(next));
          } catch {}
        } else {
          setSession(null);
          try {
            localStorage.removeItem(LS_KEY);
          } catch {}
        }
      } catch (e: any) {
        // Ignorar errores de abort
        if (e?.name === "AbortError") return;
        // Mantener sesión cache si existe
      } finally {
        fetchingRef.current = false;
        if (mountedRef.current && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [version]);

  // Refresh con debounce mejorado usando ref
  const refresh = useCallback(() => {
    // Cancelar cualquier refresh pendiente
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    // Debounce de 150ms para agrupar llamadas rápidas
    refreshTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setVersion((v) => v + 1);
      }
      refreshTimeoutRef.current = null;
    }, 150);
  }, []);

  // SSE y eventos de ventana - con cleanup mejorado
  useEffect(() => {
    const handleEvent = () => {
      if (mountedRef.current) {
        refresh();
      }
    };

    window.addEventListener("cash:session-changed", handleEvent);
    window.addEventListener("businessHours:changed", handleEvent);

    // Conectar al SSE singleton
    connectSSE(handleEvent);

    return () => {
      window.removeEventListener("cash:session-changed", handleEvent);
      window.removeEventListener("businessHours:changed", handleEvent);
      disconnectSSE(handleEvent);

      // Limpiar timeout pendiente
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [refresh]);

  const openSession = useCallback(
    async (openingAmount: number, customWindowClose?: Date) => {
      // Calcular ventana operacional actual
      const operationalWindow = getOperationalWindow(new Date());
      
      // Usar windowClose personalizado si se proporciona, sino usar el de la ventana calculada
      const windowOpen = operationalWindow.open.toISOString();
      const windowClose = customWindowClose 
        ? customWindowClose.toISOString() 
        : operationalWindow.close.toISOString();
      
      const resp = await apiFetch("/api/cash-session/open", {
        method: "POST",
        body: JSON.stringify({ openingAmount, windowOpen, windowClose }),
      });
      const data = await resp.json();
      
      // 409 = sesión ya abierta (overlap), 201 = nueva sesión
      if (resp.status === 409) {
        data.already = true;
      } else if (!resp.ok) {
        throw new Error(data?.message || "Error abriendo sesión");
      }

      refresh();
      try {
        window.dispatchEvent(new CustomEvent("cash:session-changed"));
      } catch {}
      return data;
    },
    [refresh]
  );

  const closeSession = useCallback(
    async (closingAmount?: number, declaredCash?: number) => {
      await postJSON("/api/cash-session/close", {
        closingAmount,
        declaredCash,
      });
      refresh();
      try {
        window.dispatchEvent(new CustomEvent("cash:session-changed"));
      } catch {}
    },
    [refresh]
  );

  /**
   * Extiende la ventana de cierre de la sesión activa (server-controlled).
   * Retorna el nuevo windowClose y los minutos que se extendieron.
   */
  const extendSession = useCallback(
    async (reason?: string) => {
      const data = await postJSON("/api/cash-session/extend", { reason });
      refresh();
      try {
        window.dispatchEvent(new CustomEvent("cash:session-changed"));
      } catch {}
      return data;
    },
    [refresh]
  );

  const addMovement = useCallback(
    async (movement: {
      type: "sale" | "withdrawal" | "deposit" | "adjustment";
      amount: number;
      description?: string;
      paymentMethod?: string;
      referenceId?: string;
    }) => {
      const data = await postJSON("/api/cash-movements", movement);
      try {
        window.dispatchEvent(new CustomEvent("cash:movement-added"));
      } catch {}
      return data;
    },
    []
  );

  const getCurrentBalance = useCallback(async () => {
    try {
      return await apiFetchJSON("/api/cash-session/balance", {
        cache: "no-store",
      });
    } catch {
      return null;
    }
  }, []);

  const getCurrentMovements = useCallback(async () => {
    try {
      return await apiFetchJSON("/api/cash-movements/current", {
        cache: "no-store",
      });
    } catch (e) {
      return [];
    }
  }, []);

  /**
   * Verifica si estamos en un nuevo turno respecto a la sesión actual.
   * Útil para mostrar alertas o forzar cierre de caja cuando cambia el turno.
   */
  const checkShiftChange = useCallback(async () => {
    try {
      const result = await apiFetchJSON<{
        isNewShift: boolean;
        hasActiveSession: boolean;
        sessionId?: number;
        sessionOpenTime?: string;
        sessionWindowClose?: string | null;
        currentWindow: { open: string; close: string };
        previousWindow?: { open: string; close: string };
        pastScheduledClose?: boolean;
        reason: string;
      }>("/api/settings/cash-session/check-shift", {
        cache: "no-store",
      });
      return result;
    } catch (error) {
      return null;
    }
  }, []);

  // Memoizar valores derivados - recalcular al cambiar sesión o versión
  const within = useMemo(() => isWithinOperationalHours(), [version]);
  const opWindow = useMemo(() => getOperationalWindow(), [version]);
  const closeAt = useMemo(() => getCloseTime(), [version]);
  const nextOpen = useMemo(() => getNextOpenTime(), [version]);
  const mustOpen = !session;

  return {
    session,
    mustOpen,
    loading,
    refresh,
    openSession,
    closeSession,
    extendSession,
    addMovement,
    getCurrentBalance,
    getCurrentMovements,
    checkShiftChange,
    withinOperationalHours: within,
    window: opWindow,
    closeAt,
    nextOpen,
  } as const;
}
