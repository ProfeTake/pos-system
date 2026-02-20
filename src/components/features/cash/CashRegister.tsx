import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { useCashStatus } from "../../../hooks/CashStatusContext";
import type { CashMovement } from "../../../types";
import { getOperationalWindow } from "../../../utils/businessHours";
import { getPreferredPrinter } from "../pos/preferences";
import { printReceiptViaElectron } from "../pos/electronPrint";
import {
  getCashMovementsSummaryHtml,
  printCashMovementsSummary,
} from "../../common/ReceiptPrinter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
// Modal de cambio de turno removido: se usará alerta inline dentro del diálogo

export interface CashRegisterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCashClosed?: () => void; // Callback opcional cuando se cierra la caja
}

const LS_MOVEMENT_DRAFT = "pos.cash.movementDraft";

export default function CashRegisterDialog({
  isOpen,
  onClose,
  onCashClosed,
}: CashRegisterDialogProps) {
  // Usar contexto compartido en lugar del hook directo para evitar múltiples pollings
  const {
    session,
    refresh,
    openSession,
    closeSession,
    addMovement,
    getCurrentMovements,
    getCurrentBalance,
    checkShiftChange,
  } = useCashStatus();

  // Evitar doble impresión (manual + efecto de auto-cierre)
  const printedOnCloseRef = useRef(false);

  // Estado para detectar si hubo cierre automático y mostrar confirmación
  const [wasAutoClosed, setWasAutoClosed] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [pendingReopenAmount, setPendingReopenAmount] = useState<number | null>(null);

  // Estados para el modal de cambio de turno híbrido
  const [shiftChangeData, setShiftChangeData] = useState<any>(null);
  const [checkingShift, setCheckingShift] = useState(false);

  // Opening form state
  const openingInputRef = useRef<HTMLInputElement | null>(null);
  const [openingAmountInput, setOpeningAmountInput] = useState("");
  const [openingLoading, setOpeningLoading] = useState(false);
  
  // Función para abrir caja con windowClose extendido (para reapertura post cierre automático)
  const openSessionExtended = async (amount: number) => {
    // Crear un windowClose extendido: +2 horas desde ahora
    const extendedClose = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const data = await openSession(amount, extendedClose);
    return data;
  };

  // Accion reutilizable: abrir caja desde botón o tecla Enter
  const handleOpenCash = async () => {
    if (openingLoading) return;
    if (!openingAmountInput || openingAmountInput.trim() === "") {
      toast.error("Ingrese un monto de apertura");
      return;
    }
    const opening = Number(openingAmountInput);
    if (Number.isNaN(opening) || opening <= 0) {
      toast.error("Monto inválido");
      return;
    }
    
    // Si hubo cierre automático, mostrar confirmación primero
    if (wasAutoClosed) {
      setPendingReopenAmount(opening);
      setShowReopenConfirm(true);
      return;
    }
    
    await doOpenCash(opening, false);
  };

  // Función que realmente abre la caja
  const doOpenCash = async (opening: number, isReopen: boolean) => {
    setOpeningLoading(true);
    try {
      let data;
      if (isReopen) {
        // Reapertura: usar windowClose extendido (+2 horas)
        const extendedClose = new Date(Date.now() + 2 * 60 * 60 * 1000);
        data = await openSession(opening, extendedClose);
      } else {
        data = await openSession(opening);
      }
      
      if (data?.already) toast("Caja ya estaba abierta en este turno");
      else toast.success(isReopen ? "Caja reabierta (sesión extendida 2 horas)" : "Caja abierta");
      
      setOpeningAmountInput("");
      setWasAutoClosed(false); // Reset flag
      setPendingReopenAmount(null);
      try {
        await refresh();
      } catch {}
      onClose();
    } catch {
      toast.error("No se pudo abrir la caja en el servidor");
    } finally {
      setOpeningLoading(false);
    }
  };

  // Confirmar reapertura
  const confirmReopen = async () => {
    setShowReopenConfirm(false);
    if (pendingReopenAmount !== null) {
      await doOpenCash(pendingReopenAmount, true);
    }
  };

  // Cancelar reapertura
  const cancelReopen = () => {
    setShowReopenConfirm(false);
    setPendingReopenAmount(null);
  };

  useEffect(() => {
    if (isOpen && !session) {
      // focus when opening dialog and no session
      setTimeout(() => openingInputRef.current?.focus(), 50);
    }
  }, [isOpen, session]);

  // Movements state
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  // UX: Seleccionar todo en el primer clic del campo Monto
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const amountSelectOnceRef = useRef(false);

  const loadMovements = async () => {
    setLoadingMovements(true);
    try {
      const data = await getCurrentMovements();
      setMovements(Array.isArray(data) ? data : []);
    } catch {
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    if (isOpen && session) {
      loadMovements();
    } else if (!session) {
      setMovements([]);
    }
  }, [isOpen, session?.openedAt]);

  // Resetear bandera cuando se abre una nueva sesión
  useEffect(() => {
    if (session) {
      printedOnCloseRef.current = false;
    }
  }, [session?.openedAt]);

  // Draft for new movement (persist locally)
  // Tipos válidos para registrar desde el frontend (sin los del backend INGRESO/EGRESO)
  type FrontendMovementType = "sale" | "deposit" | "withdrawal" | "adjustment";
  const [movementDraft, setMovementDraft] = useState<{
    type: FrontendMovementType;
    method?: "cash" | "debit" | "credit" | "transfer";
    amount: number;
    description: string;
  }>(() => {
    try {
      const raw = localStorage.getItem(LS_MOVEMENT_DRAFT);
      return raw
        ? JSON.parse(raw)
        : { type: "deposit", method: "cash", amount: 0, description: "" };
    } catch {
      return { type: "deposit", method: "cash", amount: 0, description: "" };
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(LS_MOVEMENT_DRAFT, JSON.stringify(movementDraft));
    } catch {}
  }, [movementDraft]);

  // Derived current balance (local projection)
  const currentBalance = useMemo(() => {
    if (!session) return 0;
    const delta = movements.reduce((acc, m) => acc + Number(m.amount || 0), 0);
    return Number(session.openingAmount || 0) + delta;
  }, [session, movements]);

  // Auto-close hint (soft)
  const closeDue = useMemo(() => {
    if (!session?.windowClose) return false;
    const now = Date.now();
    const closeTs = new Date(session.windowClose).getTime();
    return now >= closeTs;
  }, [session?.windowClose]);

  // Estado para countdown y extensión de tiempo
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [extendedWindowClose, setExtendedWindowClose] = useState<Date | null>(null);
  const warningShownRef = useRef<Set<number>>(new Set()); // Evitar repetir toasts

  // Calcular tiempo restante y mostrar advertencias
  useEffect(() => {
    if (!session?.windowClose) {
      setSecondsLeft(null);
      setShowCountdown(false);
      return;
    }

    const effectiveClose = extendedWindowClose || new Date(session.windowClose);

    const updateCountdown = () => {
      const now = Date.now();
      const closeTs = effectiveClose.getTime();
      const msLeft = closeTs - now;
      const secs = Math.max(0, Math.ceil(msLeft / 1000));
      const mins = Math.ceil(msLeft / 60000);
      
      setSecondsLeft(secs);

      // Mostrar countdown cuando quedan 2 minutos o menos
      if (mins <= 2 && secs > 0) {
        setShowCountdown(true);
      } else {
        setShowCountdown(false);
      }

      // Toasts de advertencia en minutos específicos
      if (mins === 10 && !warningShownRef.current.has(10)) {
        toast.warning("Quedan 10 minutos para el cierre de caja");
        warningShownRef.current.add(10);
      } else if (mins === 5 && !warningShownRef.current.has(5)) {
        toast.warning("Quedan 5 minutos para el cierre de caja");
        warningShownRef.current.add(5);
      } else if (mins === 2 && !warningShownRef.current.has(2)) {
        toast.warning("¡Quedan 2 minutos! Puedes extender el tiempo si lo necesitas.");
        warningShownRef.current.add(2);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [session?.windowClose, extendedWindowClose]);

  // Reset warnings cuando cambia la sesión
  useEffect(() => {
    if (!session) {
      warningShownRef.current.clear();
      setExtendedWindowClose(null);
      setShowCountdown(false);
    }
  }, [session]);

  // Función para extender el tiempo 10 minutos
  const extendTime = () => {
    const currentClose = extendedWindowClose || (session?.windowClose ? new Date(session.windowClose) : new Date());
    const newClose = new Date(currentClose.getTime() + 10 * 60 * 1000); // +10 minutos
    setExtendedWindowClose(newClose);
    // Limpiar warnings para que puedan mostrarse de nuevo si es necesario
    warningShownRef.current.clear();
    toast.success("Tiempo extendido 10 minutos");
  };

  // Referencia para evitar múltiples cierres automáticos
  const autoCloseTriggeredRef = useRef(false);

  // Verificar cierre considerando extensión
  const effectiveCloseDue = useMemo(() => {
    if (!session) return false;
    const closeTime = extendedWindowClose || (session.windowClose ? new Date(session.windowClose) : null);
    if (!closeTime) return false;
    return Date.now() >= closeTime.getTime();
  }, [session, extendedWindowClose, secondsLeft]); // secondsLeft para re-evaluar cada segundo

  // Reset del flag cuando cambia la sesión (nueva apertura)
  useEffect(() => {
    if (!session) {
      autoCloseTriggeredRef.current = false;
    }
  }, [session]);

  const resetUIAfterClose = () => {
    setMovements([]);
    const resetDraft = {
      amount: 0,
      description: "",
      type: "deposit" as const,
      method: movementDraft.method,
    };
    setMovementDraft(resetDraft);
    try {
      localStorage.setItem(LS_MOVEMENT_DRAFT, JSON.stringify(resetDraft));
    } catch {}
    try {
      refresh();
    } catch {}
  };

  // Helper: imprimir resumen de movimientos de caja (excluye ventas)
  const printMovementsSummary = async () => {
    if (!session) return;
    try {
      // Obtener la lista más reciente posible desde el servidor; si falla, usar estado local
      let latest: CashMovement[] | null = null;
      try {
        latest = await getCurrentMovements();
      } catch {
        latest = null;
      }
      const list = Array.isArray(latest) && latest.length ? latest : movements;

      const nonSale = list.filter((m) => m.type !== "sale");

      const inflow = nonSale
        .map((m) => Number(m.amount) || 0)
        .filter((n) => n > 0)
        .reduce((s, n) => s + n, 0);
      const outflow = nonSale
        .map((m) => Number(m.amount) || 0)
        .filter((n) => n < 0)
        .reduce((s, n) => s + Math.abs(n), 0);
      const byMethod = nonSale.reduce(
        (
          acc: Record<string, { inflow: number; outflow: number }>,
          m: CashMovement
        ) => {
          const k = (m.paymentMethod as string) || "-";
          const amt = Number(m.amount) || 0;
          if (!acc[k]) acc[k] = { inflow: 0, outflow: 0 };
          if (amt >= 0) acc[k].inflow += amt;
          else acc[k].outflow += Math.abs(amt);
          return acc;
        },
        {}
      );

      // Fecha compacta para ticket 80mm: dd-MM HH:mm
      const formatTicketDate = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        return `${dd}-${mm} ${hh}:${min}`;
      };

      const translateType = (t: string) => {
        switch (t) {
          case "sale":
            return "Venta";
          case "deposit":
            return "Ingreso";
          case "withdrawal":
            return "Egreso";
          case "adjustment":
            return "Ajuste";
          default:
            return t;
        }
      };
      const translateMethod = (m?: string) => {
        switch (m) {
          case "cash":
            return "Efectivo";
          case "debit":
            return "Débito";
          case "credit":
            return "Crédito";
          case "transfer":
            return "Transferencia";
          case "-":
          case undefined:
          case null:
            return "-";
          default:
            return m;
        }
      };
      const movementsDetail = nonSale.map((m) => {
        const rawDate = new Date((m as any).date || (m as any).createdAt);
        return {
          date: isNaN(rawDate.getTime()) ? "" : formatTicketDate(rawDate),
          type: translateType(m.type),
          method: translateMethod((m as any).paymentMethod),
          description: m.description || "-",
          amount: Number(m.amount) || 0,
        };
      });

      const openLabel = session.windowOpen
        ? new Date(session.windowOpen).toLocaleString("es-CL")
        : getOperationalWindow(new Date()).open.toLocaleString("es-CL");
      const closeLabel = session.windowClose
        ? new Date(session.windowClose).toLocaleString("es-CL")
        : getOperationalWindow(new Date()).close.toLocaleString("es-CL");
      const data = {
        storeName: "Punto tres",
        generatedAt: new Date(),
        windowLabel: `${openLabel} - ${closeLabel}`,
        openingAmount: Number(session.openingAmount || 0),
        inflow,
        outflow,
        net: inflow - outflow,
        byMethod,
        movements: movementsDetail,
      };
      // Calcular saldo final: apertura + ingresos - egresos
      const closingBalance =
        Number(session.openingAmount || 0) + inflow - outflow;
      const html = getCashMovementsSummaryHtml({ ...data, closingBalance });
      const preferred = getPreferredPrinter() || undefined;
      const printed = await printReceiptViaElectron(html, preferred);
      if (!printed) {
        printCashMovementsSummary(data);
      }
    } catch (e) {
      console.warn("Fallo impresión resumen de caja", e);
      try {
        // Fallback extremo si falla todo
        alert("No fue posible imprimir el resumen de caja.");
      } catch {}
    }
  };

  // Cerrar automáticamente solo si hubo transición de sesión activa -> null mientras la modal estaba abierta
  const prevSessionRef = useRef<typeof session | null>(session);
  useEffect(() => {
    const prev = prevSessionRef.current;
    if (isOpen && prev && !session) {
      try {
        toast.info("Caja cerrada automáticamente");
      } catch {}
      // Imprimir resumen de movimientos de caja (excluyendo ventas)
      if (!printedOnCloseRef.current) {
        printMovementsSummary().catch(() => {});
        printedOnCloseRef.current = true;
      }
      resetUIAfterClose();
      onClose();
    }
    prevSessionRef.current = session;
  }, [isOpen, session]);

  // Verificar periódicamente si hay cambio de turno (híbrido)
  useEffect(() => {
    if (!session || !isOpen) return;

    const checkForShiftChange = async () => {
      if (checkingShift) return;

      setCheckingShift(true);
      try {
        const result = await checkShiftChange();
        if (result?.isNewShift && !shiftChangeData?.isNewShift) {
          setShiftChangeData(result);
        }
      } catch (e) {
        // Silenciar errores de detección de turno
      } finally {
        setCheckingShift(false);
      }
    };

    // Check inicial y luego cada 5 minutos
    checkForShiftChange();
    const interval = setInterval(checkForShiftChange, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [session, isOpen, checkShiftChange, shiftChangeData?.isNewShift, checkingShift]);

  // Handlers para el modal de cambio de turno
  const handleClosePreviousShift = async () => {
    try {
      // Obtener balance actual del servidor
      const b = await getCurrentBalance();
      const balance = Number(b?.balance ?? currentBalance);
      await closeSession(balance);
      
      // Imprimir resumen
      if (!printedOnCloseRef.current) {
        try {
          await printMovementsSummary();
        } catch {}
        printedOnCloseRef.current = true;
      }
      
      toast.success("Turno anterior cerrado correctamente");
      resetUIAfterClose();
      setShiftChangeData(null);
      onCashClosed?.();
    } catch (e: any) {
      console.error("Error al cerrar turno anterior:", e);
      toast.error("Error al cerrar el turno anterior: " + (e.message || "Error desconocido"));
    }
  };

  const handleContinueSession = () => {
    toast.info("Continuando con la sesión actual");
    setShiftChangeData(null);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Caja</DialogTitle>
          <DialogDescription>
            {session ? "Turno activo" : "Debes abrir la caja para operar"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!session ? (
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">
                  Monto de apertura
                </label>
                <Input
                  ref={openingInputRef}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={openingAmountInput}
                  onChange={(e) =>
                    setOpeningAmountInput(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleOpenCash();
                    }
                  }}
                />
              </div>
              <Button
                className="w-full"
                disabled={openingLoading}
                onClick={handleOpenCash}
              >
                {openingLoading ? "Abriendo..." : "Abrir caja"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Aviso inline: nuevo turno detectado */}
              {shiftChangeData?.isNewShift && (
                <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 py-2">
                  <AlertTitle className="text-sm flex items-center gap-2">
                    <span>Nuevo turno detectado</span>
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    {shiftChangeData?.reason ? (
                      <span className="block mb-2 text-amber-700 dark:text-amber-300">{shiftChangeData.reason}</span>
                    ) : null}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleClosePreviousShift}
                        disabled={checkingShift || registerLoading}
                      >
                        Cerrar turno anterior
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleContinueSession}
                        disabled={checkingShift}
                      >
                        Continuar sesión
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Countdown cuando quedan 2 minutos o menos */}
              {showCountdown && secondsLeft !== null && secondsLeft > 0 && (
                <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20 py-2">
                  <AlertTitle className="text-sm flex items-center gap-2">
                    <span className="text-orange-600 dark:text-orange-400 font-bold text-lg tabular-nums">
                      {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                    </span>
                    <span>para cierre automático</span>
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-500 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                      onClick={extendTime}
                    >
                      +10 minutos
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Alerta de fin de turno (cuando ya pasó el tiempo) */}
              {effectiveCloseDue && (
                <Alert className="border-amber-500/50 py-2">
                  <AlertTitle className="text-sm">La ventana operativa terminó</AlertTitle>
                  <AlertDescription className="text-xs">
                    <span>Cierra la caja para conservar la integridad del turno.</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-2"
                      onClick={async () => {
                        try {
                          const b = await getCurrentBalance();
                          const balance = Number(b?.balance ?? 0);
                          await closeSession(balance);
                          try {
                            await printMovementsSummary();
                          } catch {}
                          toast.success(
                            "Caja cerrada con balance del servidor"
                          );
                          resetUIAfterClose();
                          onClose();
                          // Notificar al padre que la caja se cerró
                          onCashClosed?.();
                        } catch (e: any) {
                          toast.error(
                            e?.message ||
                              "No se pudo cerrar la caja automáticamente"
                          );
                        }
                      }}
                    >
                      Cerrar ahora
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Apertura</div>
                  <div className="font-semibold text-sm">
                    ${session.openingAmount.toLocaleString("es-CL")}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Saldo actual</div>
                  <div className="text-lg font-bold text-primary">
                    ${currentBalance.toLocaleString("es-CL")}
                  </div>
                </div>
              </div>
              {session.windowOpen && (
                <div className="text-xs text-muted-foreground">
                  Ventana: {new Date(session.windowOpen).toLocaleString()} →{" "}
                  {session.windowClose
                    ? new Date(session.windowClose).toLocaleString()
                    : "?"}
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={async () => {
                  const confirmed = confirm("¿Cerrar caja?");
                  if (!confirmed) return;
                  try {
                    await closeSession(currentBalance);
                    try {
                      await printMovementsSummary();
                    } catch {}
                    toast.success("Caja cerrada");
                    resetUIAfterClose();
                    onClose();
                    // Notificar al padre que la caja se cerró
                    onCashClosed?.();
                  } catch {
                    toast.error("No se pudo cerrar la caja en el servidor");
                  }
                }}
              >
                Cerrar caja
              </Button>

              <Separator />
              <h4 className="text-xs font-medium text-muted-foreground">
                Registrar movimiento
              </h4>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Tipo</label>
                    <Select
                      value={movementDraft.type}
                      onValueChange={(v) =>
                        setMovementDraft((m) => ({ ...m, type: v as any }))
                      }
                    >
                      <SelectTrigger className="w-full h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sale">Venta</SelectItem>
                        <SelectItem value="deposit">Ingreso</SelectItem>
                        <SelectItem value="withdrawal">Retiro</SelectItem>
                        <SelectItem value="adjustment">Ajuste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Método</label>
                  <Select
                    value={movementDraft.method || "cash"}
                    onValueChange={(v) =>
                      setMovementDraft((m) => ({ ...m, method: v as any }))
                    }
                  >
                    <SelectTrigger className="w-full h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="debit">Débito</SelectItem>
                      <SelectItem value="credit">Crédito</SelectItem>
                      <SelectItem value="transfer">Transf.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
                <div>
                  <label className="text-xs text-muted-foreground">Monto ($)</label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    ref={amountInputRef}
                    onMouseDown={(e) => {
                      // Primer clic: prevenir posición de cursor y seleccionar todo
                      if (!amountSelectOnceRef.current) {
                        e.preventDefault();
                        const el = amountInputRef.current;
                        el?.focus();
                        setTimeout(() => {
                          try {
                            el?.select();
                          } catch {}
                        }, 0);
                        amountSelectOnceRef.current = true;
                      }
                    }}
                    onFocus={() => {
                      // También cubrir navegación con teclado: seleccionar al enfocar por primera vez
                      if (!amountSelectOnceRef.current) {
                        const el = amountInputRef.current;
                        setTimeout(() => {
                          try {
                            el?.select();
                          } catch {}
                        }, 0);
                        amountSelectOnceRef.current = true;
                      }
                    }}
                    onBlur={() => {
                      // Permitir que en el próximo enfoque se seleccione de nuevo
                      amountSelectOnceRef.current = false;
                    }}
                    value={movementDraft.amount}
                    onChange={(e) =>
                      setMovementDraft((m) => ({
                        ...m,
                        amount: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Descripción</label>
                  <Input
                    className="h-8 text-sm"
                    value={movementDraft.description}
                    onChange={(e) =>
                      setMovementDraft((m) => ({
                        ...m,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={async () => {
                      try {
                        await printMovementsSummary();
                      } catch (e) {
                        console.warn("Resumen movimientos no impreso", e);
                      }
                    }}
                  >
                    Imprimir
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={registerLoading}
                    onClick={async () => {
                      if (registerLoading) return;
                      setRegisterLoading(true);
                      if (!session) return;
                      const amount = Number(movementDraft.amount) || 0;
                      if (amount === 0) {
                        setRegisterLoading(false);
                        toast.error("Monto debe ser distinto de 0");
                        return;
                      }
                      // Validación local para retiros
                      if (movementDraft.type === "withdrawal") {
                        const localDelta = movements.reduce(
                          (acc: number, m: CashMovement) => acc + m.amount,
                          0
                        );
                        const projected =
                          session.openingAmount +
                          localDelta -
                          Math.abs(amount);
                        if (projected < 0) {
                          toast.error(
                            "Saldo insuficiente para realizar el retiro"
                          );
                          return;
                        }
                      }
                      try {
                        const result = await addMovement({
                          type: movementDraft.type,
                          amount:
                            movementDraft.type === "withdrawal"
                              ? -Math.abs(amount)
                              : amount,
                          description: movementDraft.description,
                          paymentMethod: movementDraft.method,
                        });
                        if (result?.movement) {
                          setMovements((prev) => [result.movement, ...prev]);
                        } else {
                          // Fallback: recargar lista
                          loadMovements();
                        }
                        try {
                          await getCurrentBalance();
                        } catch {}
                        const resetDraft = {
                          amount: 0,
                          description: "",
                          type: "deposit" as const,
                          method: movementDraft.method,
                        };
                        setMovementDraft(resetDraft);
                        try {
                          localStorage.setItem(
                            LS_MOVEMENT_DRAFT,
                            JSON.stringify(resetDraft)
                          );
                        } catch {}
                        setRegisterLoading(false);
                        toast.success("Movimiento registrado");
                      } catch (e: any) {
                        setRegisterLoading(false);
                        toast.error(
                          e?.message || "Error al registrar movimiento"
                        );
                      }
                    }}
                  >
                    {registerLoading ? "..." : "Registrar"}
                  </Button>
                </div>
              </div>

              <Separator />
              <h4 className="text-xs font-medium text-muted-foreground">
                Movimientos
              </h4>
              <div className="max-h-32 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs py-1">Fecha</TableHead>
                      <TableHead className="text-xs py-1">Tipo</TableHead>
                      <TableHead className="text-xs py-1 text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingMovements ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-xs py-1">
                          Cargando...
                        </TableCell>
                      </TableRow>
                    ) : (
                      movements.slice(0, 5).map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-xs py-1">
                            {new Date(
                              m.date || (m as any).createdAt
                            ).toLocaleTimeString()}
                          </TableCell>
                          <TableCell className="text-xs py-1">{m.type}</TableCell>
                          <TableCell
                            className={`text-xs py-1 text-right ${
                              m.amount < 0
                                ? "text-destructive"
                                : "text-emerald-600"
                            }`}
                          >
                            {m.amount < 0 ? "-" : "+"}$
                            {Math.abs(m.amount).toLocaleString("es-CL")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {!loadingMovements && movements.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-muted-foreground text-xs py-1"
                        >
                          Sin movimientos
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Modal de confirmación para reabrir después de cierre automático */}
      <Dialog open={showReopenConfirm} onOpenChange={(open) => !open && cancelReopen()}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>¿Reabrir caja?</DialogTitle>
            <DialogDescription>
              La caja se cerró automáticamente al fin del turno. 
              Si reabres, la sesión se extenderá por 2 horas adicionales.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={cancelReopen}>
              Cancelar
            </Button>
            <Button onClick={confirmReopen} disabled={openingLoading}>
              {openingLoading ? "Abriendo..." : "Sí, reabrir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </Dialog>

    </>
  );
}
