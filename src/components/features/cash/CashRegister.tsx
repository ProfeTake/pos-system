import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import { Alert, AlertDescription, AlertTitle } from "../../ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/tabs";
import { useCashStatus } from "../../../hooks/CashStatusContext";
import { useCashDraft } from "../../../hooks/useCashDraft";
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
import { CashOpeningForm } from "./CashOpeningForm";
import { CashMovementsPanel } from "./CashMovementsPanel";
import { CashClosingWizard } from "./CashClosingWizard";

export interface CashRegisterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCashClosed?: () => void;
}

export default function CashRegisterDialog({
  isOpen,
  onClose,
  onCashClosed,
}: CashRegisterDialogProps) {
  const {
    session,
    refresh,
    openSession,
    closeSession,
    extendSession,
    addMovement,
    getCurrentMovements,
    getCurrentBalance,
    checkShiftChange,
  } = useCashStatus();

  // Draft for new movement
  const { draft, updateDraft, resetDraft } = useCashDraft();

  // Prevent double-printing
  const printedOnCloseRef = useRef(false);

  // Auto-close detection
  const [wasAutoClosed, setWasAutoClosed] = useState(false);

  // Shift change detection
  const [shiftChangeData, setShiftChangeData] = useState<any>(null);
  const [checkingShift, setCheckingShift] = useState(false);

  // Opening form state
  const [openingLoading, setOpeningLoading] = useState(false);

  // Movements
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  // Closing wizard
  const [showClosingWizard, setShowClosingWizard] = useState(false);
  const [closingBalance, setClosingBalance] = useState(0);
  const [closingLoading, setClosingLoading] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState("summary");

  // Countdown state
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);

  // ─────────────────────────────────────────────────────
  // Derived values
  // ─────────────────────────────────────────────────────
  const currentBalance = useMemo(() => {
    if (!session) return 0;
    const delta = movements.reduce((acc, m) => acc + Number(m.amount || 0), 0);
    return Number(session.openingAmount || 0) + delta;
  }, [session, movements]);

  const effectiveCloseDue = useMemo(() => {
    if (!session?.windowClose) return false;
    const closeTime = new Date(session.windowClose);
    return Date.now() >= closeTime.getTime();
  }, [session?.windowClose, secondsLeft]);

  // ─────────────────────────────────────────────────────
  // Movements loading
  // ─────────────────────────────────────────────────────
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

  // Reset on new session
  useEffect(() => {
    if (session) {
      printedOnCloseRef.current = false;
    }
  }, [session?.openedAt]);

  // ─────────────────────────────────────────────────────
  // Countdown timer (server-driven windowClose)
  // ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.windowClose) {
      setSecondsLeft(null);
      setShowCountdown(false);
      return;
    }

    const closeTime = new Date(session.windowClose);

    const updateCountdown = () => {
      const msLeft = closeTime.getTime() - Date.now();
      const secs = Math.max(0, Math.ceil(msLeft / 1000));
      setSecondsLeft(secs);
      setShowCountdown(secs > 0 && secs <= 120); // Show when ≤2 min
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [session?.windowClose]);

  // Reset countdown state when session changes
  useEffect(() => {
    if (!session) {
      setShowCountdown(false);
    }
  }, [session]);

  // ─────────────────────────────────────────────────────
  // Open cash register
  // ─────────────────────────────────────────────────────
  const handleOpenCash = async (amount: number) => {
    setOpeningLoading(true);
    try {
      const data = await openSession(amount);
      if (data?.already) {
        toast("Caja ya estaba abierta en este turno");
      } else {
        toast.success("Caja abierta");
      }
      setWasAutoClosed(false);
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

  // ─────────────────────────────────────────────────────
  // Extend session (server-controlled)
  // ─────────────────────────────────────────────────────
  const handleExtendTime = async () => {
    try {
      const result = await extendSession("Extensión solicitada por operador");
      if (result?.extendedMinutes) {
        toast.success(`Tiempo extendido ${result.extendedMinutes} minutos`);
      } else {
        toast.success("Tiempo extendido");
      }
    } catch (e: any) {
      toast.error(e?.message || "No se pudo extender el tiempo");
    }
  };

  // ─────────────────────────────────────────────────────
  // Print summary helper
  // ─────────────────────────────────────────────────────
  const printMovementsSummary = async () => {
    if (!session) return;
    try {
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
        (acc: Record<string, { inflow: number; outflow: number }>, m: CashMovement) => {
          const k = (m.paymentMethod as string) || "-";
          const amt = Number(m.amount) || 0;
          if (!acc[k]) acc[k] = { inflow: 0, outflow: 0 };
          if (amt >= 0) acc[k].inflow += amt;
          else acc[k].outflow += Math.abs(amt);
          return acc;
        },
        {}
      );

      const formatTicketDate = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        return `${dd}-${mm} ${hh}:${min}`;
      };

      const translateType = (t: string) => {
        switch (t) {
          case "sale": return "Venta";
          case "deposit": return "Ingreso";
          case "withdrawal": return "Egreso";
          case "adjustment": return "Ajuste";
          case "INGRESO": return "Ingreso";
          case "EGRESO": return "Egreso";
          default: return t;
        }
      };
      const translateMethod = (m?: string) => {
        switch (m) {
          case "cash": return "Efectivo";
          case "debit": return "Débito";
          case "credit": return "Crédito";
          case "transfer": return "Transferencia";
          default: return m || "-";
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
      const closingBal = Number(session.openingAmount || 0) + inflow - outflow;
      const html = getCashMovementsSummaryHtml({ ...data, closingBalance: closingBal });
      const preferred = getPreferredPrinter() || undefined;
      const printed = await printReceiptViaElectron(html, preferred);
      if (!printed) {
        printCashMovementsSummary(data);
      }
    } catch (e) {
      console.warn("Fallo impresión resumen de caja", e);
    }
  };

  // ─────────────────────────────────────────────────────
  // Reset UI after close
  // ─────────────────────────────────────────────────────
  const resetUIAfterClose = () => {
    setMovements([]);
    resetDraft();
    setShowClosingWizard(false);
    setActiveTab("summary");
    try {
      refresh();
    } catch {}
  };

  // ─────────────────────────────────────────────────────
  // Auto-close detection (session went from active → null)
  // ─────────────────────────────────────────────────────
  const prevSessionRef = useRef<typeof session | null>(session);
  useEffect(() => {
    const prev = prevSessionRef.current;
    if (isOpen && prev && !session) {
      toast.info("Caja cerrada automáticamente");
      if (!printedOnCloseRef.current) {
        printMovementsSummary().catch(() => {});
        printedOnCloseRef.current = true;
      }
      setWasAutoClosed(true);
      resetUIAfterClose();
      onClose();
    }
    prevSessionRef.current = session;
  }, [isOpen, session]);

  // ─────────────────────────────────────────────────────
  // Shift change check (periodic)
  // ─────────────────────────────────────────────────────
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
      } catch {}
      finally {
        setCheckingShift(false);
      }
    };

    checkForShiftChange();
    const interval = setInterval(checkForShiftChange, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session, isOpen, checkShiftChange, shiftChangeData?.isNewShift, checkingShift]);

  // ─────────────────────────────────────────────────────
  // Shift change handlers
  // ─────────────────────────────────────────────────────
  const handleClosePreviousShift = async () => {
    try {
      const b = await getCurrentBalance();
      const balance = Number(b?.balance ?? currentBalance);
      await closeSession(balance);
      if (!printedOnCloseRef.current) {
        try { await printMovementsSummary(); } catch {}
        printedOnCloseRef.current = true;
      }
      toast.success("Turno anterior cerrado correctamente");
      resetUIAfterClose();
      setShiftChangeData(null);
      onCashClosed?.();
    } catch (e: any) {
      toast.error("Error al cerrar el turno anterior: " + (e?.message || "Error desconocido"));
    }
  };

  // ─────────────────────────────────────────────────────
  // Register movement handler
  // ─────────────────────────────────────────────────────
  const handleRegisterMovement = async () => {
    if (registerLoading || !session) return;
    setRegisterLoading(true);

    const amount = Number(draft.amount) || 0;
    if (amount === 0) {
      setRegisterLoading(false);
      toast.error("Monto debe ser distinto de 0");
      return;
    }

    // Local validation for withdrawals
    if (draft.type === "withdrawal") {
      const localDelta = movements.reduce(
        (acc: number, m: CashMovement) => acc + m.amount,
        0
      );
      const projected = session.openingAmount + localDelta - Math.abs(amount);
      if (projected < 0) {
        setRegisterLoading(false);
        toast.error("Saldo insuficiente para realizar el retiro");
        return;
      }
    }

    try {
      const result = await addMovement({
        type: draft.type,
        amount: draft.type === "withdrawal" ? -Math.abs(amount) : amount,
        description: draft.description,
        paymentMethod: draft.method,
      });
      if (result?.movement) {
        setMovements((prev) => [result.movement, ...prev]);
      } else {
        loadMovements();
      }
      resetDraft(true);
      toast.success("Movimiento registrado");
    } catch (e: any) {
      toast.error(e?.message || "Error al registrar movimiento");
    } finally {
      setRegisterLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────
  // Start closing flow (fetch server balance first)
  // ─────────────────────────────────────────────────────
  const handleStartClose = async () => {
    try {
      const b = await getCurrentBalance();
      setClosingBalance(Number(b?.balance ?? currentBalance));
      setShowClosingWizard(true);
      setActiveTab("close");
    } catch {
      // Fallback to local balance
      setClosingBalance(currentBalance);
      setShowClosingWizard(true);
      setActiveTab("close");
    }
  };

  // ─────────────────────────────────────────────────────
  // Confirm close (from wizard)
  // ─────────────────────────────────────────────────────
  const handleConfirmClose = async (
    declaredCash: number,
    systemBalance: number,
    notes?: string
  ) => {
    setClosingLoading(true);
    try {
      await closeSession(systemBalance, declaredCash);
      try {
        await printMovementsSummary();
      } catch {}
      toast.success("Caja cerrada");
      resetUIAfterClose();
      onClose();
      onCashClosed?.();
    } catch {
      toast.error("No se pudo cerrar la caja en el servidor");
    } finally {
      setClosingLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Caja</DialogTitle>
          <DialogDescription>
            {session ? "Turno activo" : "Debes abrir la caja para operar"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {!session ? (
            <CashOpeningForm
              onOpen={handleOpenCash}
              loading={openingLoading}
              wasAutoClosed={wasAutoClosed}
            />
          ) : showClosingWizard ? (
            <CashClosingWizard
              systemBalance={closingBalance}
              openingAmount={Number(session.openingAmount || 0)}
              onClose={handleConfirmClose}
              onCancel={() => {
                setShowClosingWizard(false);
                setActiveTab("summary");
              }}
              loading={closingLoading}
            />
          ) : (
            <>
              {/* Alerts: Shift change, countdown, close-due */}
              {shiftChangeData?.isNewShift && (
                <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 py-2">
                  <AlertTitle className="text-sm flex items-center gap-2">
                    Nuevo turno detectado
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    {shiftChangeData?.reason && (
                      <span className="block mb-2 text-amber-700 dark:text-amber-300">
                        {shiftChangeData.reason}
                      </span>
                    )}
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
                        onClick={() => setShiftChangeData(null)}
                        disabled={checkingShift}
                      >
                        Continuar sesión
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {showCountdown && secondsLeft !== null && secondsLeft > 0 && (
                <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20 py-2">
                  <AlertTitle className="text-sm flex items-center gap-2">
                    <span className="text-orange-600 dark:text-orange-400 font-bold text-lg tabular-nums">
                      {Math.floor(secondsLeft / 60)}:
                      {String(secondsLeft % 60).padStart(2, "0")}
                    </span>
                    <span>para cierre</span>
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-500 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                      onClick={handleExtendTime}
                    >
                      Extender tiempo
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {effectiveCloseDue && (
                <Alert className="border-amber-500/50 py-2">
                  <AlertTitle className="text-sm">
                    La ventana operativa terminó
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    Cierra la caja para conservar la integridad del turno.
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-2"
                      onClick={handleStartClose}
                    >
                      Cerrar ahora
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Main content with tabs */}
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="w-full grid grid-cols-2 h-8">
                  <TabsTrigger value="summary" className="text-xs">
                    Resumen
                  </TabsTrigger>
                  <TabsTrigger value="movements" className="text-xs">
                    Movimientos
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Apertura
                      </div>
                      <div className="font-semibold text-sm">
                        ${Number(session.openingAmount || 0).toLocaleString("es-CL")}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Saldo actual
                      </div>
                      <div className="text-lg font-bold text-primary">
                        ${currentBalance.toLocaleString("es-CL")}
                      </div>
                    </div>
                  </div>

                  {session.windowOpen && (
                    <div className="text-xs text-muted-foreground">
                      Ventana:{" "}
                      {new Date(session.windowOpen).toLocaleString("es-CL")} →{" "}
                      {session.windowClose
                        ? new Date(session.windowClose).toLocaleString("es-CL")
                        : "?"}
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={handleStartClose}
                  >
                    Cerrar caja
                  </Button>
                </TabsContent>

                <TabsContent value="movements" className="mt-3">
                  <CashMovementsPanel
                    movements={movements}
                    loadingMovements={loadingMovements}
                    openingAmount={Number(session.openingAmount || 0)}
                    draft={draft}
                    onDraftChange={updateDraft}
                    onRegister={handleRegisterMovement}
                    onPrint={printMovementsSummary}
                    registerLoading={registerLoading}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
