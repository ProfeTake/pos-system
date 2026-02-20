import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronRight,
  Wrench,
  ShieldAlert,
  RefreshCcw,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import type { Product } from "../../../types";
import { formatTime } from "../../../utils/businessHours";
import { toast } from "sonner";
import { useLowStock } from "../../../hooks/useLowStock";

type Props = {
  products: Product[];
  onViewed?: () => void;
  onSelectProduct?: (p: Product) => void;
  onAdjustProduct?: (p: Product) => void; // acción rápida de ajuste
  onOpenCash?: () => void;
  cashOpen: boolean;
  closeAt: Date;
  onAutoCloseDetected?: () => void;
};

export default function Notifications({
  products,
  onViewed,
  onSelectProduct,
  onAdjustProduct,
  onOpenCash,
  cashOpen,
  closeAt,
  onAutoCloseDetected,
}: Props) {
  const {
    critical,
    low,
    near,
    unseenCount,
    markAllSeen,
    rotationMap,
    loadingRotation,
    refreshRotation,
  } = useLowStock(products, { includeNear: true });

  const valueAtRisk = useMemo(
    () => [...critical, ...low].reduce((s, p) => s + p.stock * p.price, 0),
    [critical, low]
  );

  const handleMarkAll = () => {
    markAllSeen();
    onViewed?.();
  };

  // Tiempo restante hasta el cierre real de la sesión (prop closeAt)
  const [msLeft, setMsLeft] = useState<number>(() =>
    Math.max(0, closeAt.getTime() - Date.now())
  );
  const [preCloseFired, setPreCloseFired] = useState<string | null>(null); // guarda windowClose ISO

  // Intervalo unificado para el timer - evita crear múltiples intervalos
  useEffect(() => {
    // Función de tick que calcula el tiempo restante
    const tick = () => setMsLeft(Math.max(0, closeAt.getTime() - Date.now()));
    tick(); // Ejecutar inmediatamente

    // Calcular intervalo basado en tiempo restante
    const getInterval = () => {
      const left = closeAt.getTime() - Date.now();
      if (left <= 0) return 60000; // Si ya pasó, 1 minuto
      if (left <= 10 * 60_000) return 5000; // Últimos 10 min: cada 5s
      return 30000; // Normal: cada 30s
    };

    let intervalId: ReturnType<typeof setInterval>;

    const scheduleNext = () => {
      intervalId = setInterval(() => {
        tick();
        // Recalcular intervalo si cambia el rango
        const newInterval = getInterval();
        const currentLeft = closeAt.getTime() - Date.now();
        // Si entramos en zona de 10 min, reiniciar con intervalo más corto
        if (currentLeft <= 10 * 60_000 && currentLeft > 0) {
          clearInterval(intervalId);
          intervalId = setInterval(tick, 5000);
        }
      }, getInterval());
    };

    scheduleNext();

    return () => {
      clearInterval(intervalId);
    };
  }, [closeAt.getTime()]);

  // Alerta 10 minutos antes del cierre con audio y toast (una sola vez por ventana)
  useEffect(() => {
    if (!cashOpen) return;
    const minutesLeft = Math.floor(msLeft / 60000);
    const windowKey = new Date(closeAt).toISOString();
    if (minutesLeft <= 10 && minutesLeft >= 0 && preCloseFired !== windowKey) {
      setPreCloseFired(windowKey);
      try {
        const audio = new Audio(
          "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA="
        ); // beep corto placeholder
        audio.volume = 0.6;
        audio.play().catch(() => {});
      } catch {}
      toast.warning(
        `La caja está por cerrar a ${formatTime(closeAt)} (≈ ${Math.max(
          0,
          minutesLeft
        )} min)`,
        { duration: 4000 }
      );
    }
  }, [msLeft, cashOpen, closeAt, preCloseFired]);

  const handleOpenChange = (next: boolean) => {
    if (!next) return;
    handleMarkAll();
  };

  const minutes = Math.max(0, Math.floor(msLeft / 60000));
  const isPreclose = cashOpen && minutes <= 10; // estado visual para <=10 min

  // Si ya se pasó la hora y aún dice caja abierta, avisar al padre por si quiere refrescar
  useEffect(() => {
    if (cashOpen && msLeft <= 0) {
      onAutoCloseDetected?.();
    }
  }, [msLeft, cashOpen, onAutoCloseDetected]);

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        aria-label="Notificaciones"
        type="button"
        className="relative inline-flex items-center justify-center gap-2 h-9 px-3 rounded-md border bg-background text-foreground hover:bg-accent hover:text-accent-foreground outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      >
        <Bell className="size-4" />
        {unseenCount > 0 && (
          <span className="absolute -right-2 top-1/2 -translate-y-1/2">
            <Badge
              variant="destructive"
              className="px-1 py-0 text-[9px] leading-[14px] min-w-[14px] h-[14px] rounded-full flex items-center justify-center"
            >
              {unseenCount}
            </Badge>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 z-50 max-h-[80vh] p-0 flex flex-col"
      >
        {/* Header fijo */}
        <div className="sticky top-0 bg-background/95 backdrop-blur px-3 py-2 flex items-center gap-2 z-10 border-b shrink-0">
          <AlertTriangle className="size-4 text-destructive" />
          <DropdownMenuLabel className="p-0 m-0">
            Notificaciones
          </DropdownMenuLabel>
        </div>
        
        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="px-3 py-2 border-b">
            <div
              className={`flex items-center gap-2 text-sm ${
                isPreclose ? "text-amber-600 dark:text-amber-400" : ""
              }`}
            >
              <Clock className="size-4" />
              {cashOpen ? (
                <span>
                  Cierre de caja hoy a <b>{formatTime(closeAt)}</b>. Quedan{" "}
                  {minutes} min.
                </span>
              ) : (
                <span>Debes abrir caja para comenzar a operar.</span>
              )}
            </div>
            {!cashOpen && (
              <div className="mt-2">
                <button
                  className="text-primary underline text-sm"
                  onClick={onOpenCash}
                >
                  Abrir caja ahora
                </button>
              </div>
            )}
          </div>
          <LowStockSection
            critical={critical}
            low={low}
            near={near}
            valueAtRisk={valueAtRisk}
            rotationMap={rotationMap}
            loadingRotation={loadingRotation}
            onSelectProduct={onSelectProduct}
            onAdjustProduct={onAdjustProduct}
            onRefresh={refreshRotation}
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type LowStockSectionProps = {
  critical: Product[];
  low: Product[];
  near: Product[];
  valueAtRisk: number;
  rotationMap: Record<
    string,
    { avgDailySales?: number | null; daysOfStock?: number | null }
  >;
  loadingRotation: boolean;
  onSelectProduct?: (p: Product) => void;
  onAdjustProduct?: (p: Product) => void;
  onRefresh: () => void;
};

function LowStockSection({
  critical,
  low,
  near,
  valueAtRisk,
  rotationMap,
  loadingRotation,
  onSelectProduct,
  onAdjustProduct,
  onRefresh,
}: LowStockSectionProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [showAll, setShowAll] = useState<boolean>(false);

  const allLowStock = useMemo(() => [...critical, ...low], [critical, low]);
  const totalCount = critical.length + low.length + near.length;

  // Abrir automáticamente si hay pocos (<=5) para conveniencia
  useEffect(() => {
    if (totalCount > 0 && totalCount <= 5) setOpen(true);
  }, [totalCount]);

  // Ordenar lista por criticidad (ratio stock/minStock asc, luego stock asc)
  const sortedCritical = useMemo(() => {
    return [...allLowStock].sort((a, b) => {
      const ratioA = a.minStock === 0 ? 1 : a.stock / a.minStock;
      const ratioB = b.minStock === 0 ? 1 : b.stock / b.minStock;
      if (ratioA !== ratioB) return ratioA - ratioB; // menor ratio => más crítico
      if (a.stock !== b.stock) return a.stock - b.stock; // menor stock
      return a.name.localeCompare(b.name);
    });
  }, [allLowStock]);

  const LIMIT = 10;
  const displayList = showAll ? sortedCritical : sortedCritical.slice(0, LIMIT);
  const remaining = Math.max(0, sortedCritical.length - displayList.length);

  return (
    <div className="pb-1">
      <div className="flex items-center justify-between px-2">
        <DropdownMenuLabel className="flex items-center gap-2 p-0">
          <AlertTriangle className="size-4 text-destructive" />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1 text-sm font-medium focus:outline-none hover:underline"
            aria-expanded={open}
            aria-controls="low-stock-panel"
          >
            Stock crítico / bajo
            {open ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        </DropdownMenuLabel>
        <div className="flex items-center gap-1">
          {(critical.length + low.length) > 0 && (
            <Badge variant="destructive">{critical.length + low.length}</Badge>
          )}
          {loadingRotation && <Loader2 className="size-3 animate-spin ml-1" />}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5"
            onClick={onRefresh}
            title="Refrescar métricas"
          >
            <RefreshCcw className="size-3" />
          </Button>
        </div>
      </div>
      {open && valueAtRisk > 0 && (
        <>
          <Separator className="my-1" />
          <div className="px-3 py-1 text-xs text-muted-foreground">
            Valor en riesgo:{" "}
            <strong>${valueAtRisk.toLocaleString("es-CL")}</strong>
          </div>
        </>
      )}
      <DropdownMenuSeparator />
      {open && (
        <div
          id="low-stock-panel"
          className="px-1 pb-3"
          role="group"
          aria-label="Productos con stock bajo"
        >
          {totalCount === 0 ? (
            <div className="px-2 py-4 text-sm text-muted-foreground">
              No hay productos con stock bajo.
            </div>
          ) : (
            <>
              {/* Sección Crítico */}
              {critical.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 pt-2 pb-1 flex items-center gap-1 text-xs font-semibold">
                    <ShieldAlert className="size-3 text-destructive" />
                    <span>Crítico</span>
                    <Badge variant="outline" className="text-[10px] ml-1">
                      {critical.length}
                    </Badge>
                  </div>
                  {critical.map((p) => (
                    <ProductItemCompact
                      key={p.id}
                      p={p}
                      severity="critical"
                      rotation={rotationMap[String(p.id)]}
                      onSelect={onSelectProduct}
                      onAdjust={onAdjustProduct}
                    />
                  ))}
                </div>
              )}

              {/* Sección Bajo */}
              {low.length > 0 && (
                <div className="mb-2">
                  <div className="px-3 pt-2 pb-1 flex items-center gap-1 text-xs font-semibold">
                    <span>Bajo</span>
                    <Badge variant="outline" className="text-[10px] ml-1">
                      {low.length}
                    </Badge>
                  </div>
                  {low.map((p) => (
                    <ProductItemCompact
                      key={p.id}
                      p={p}
                      severity="low"
                      rotation={rotationMap[String(p.id)]}
                      onSelect={onSelectProduct}
                      onAdjust={onAdjustProduct}
                    />
                  ))}
                </div>
              )}

              {/* Sección En Riesgo */}
              {near.length > 0 && (
                <div>
                  <div className="px-3 pt-2 pb-1 flex items-center gap-1 text-xs font-semibold">
                    <span>En riesgo</span>
                    <Badge variant="outline" className="text-[10px] ml-1">
                      {near.length}
                    </Badge>
                  </div>
                  {near.slice(0, showAll ? near.length : 5).map((p) => (
                    <ProductItemCompact
                      key={p.id}
                      p={p}
                      severity="near"
                      rotation={rotationMap[String(p.id)]}
                      onSelect={onSelectProduct}
                      onAdjust={onAdjustProduct}
                    />
                  ))}
                  {!showAll && near.length > 5 && (
                    <div className="px-3 py-1 text-center text-xs text-muted-foreground">
                      {near.length - 5} más en riesgo.{" "}
                      <button
                        type="button"
                        onClick={() => setShowAll(true)}
                        className="underline text-foreground font-medium"
                      >
                        Ver todos
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

type Severity = "critical" | "low" | "near";

interface ProductItemCompactProps {
  p: Product;
  severity: Severity;
  rotation?: { avgDailySales?: number | null; daysOfStock?: number | null };
  onSelect?: (p: Product) => void;
  onAdjust?: (p: Product) => void;
}

function ProductItemCompact({
  p,
  severity,
  rotation,
  onSelect,
  onAdjust,
}: ProductItemCompactProps) {
  const days = rotation?.daysOfStock;
  let badgeVariant: "destructive" | "secondary" | "outline" = "outline";
  if (severity === "critical") badgeVariant = "destructive";
  else if (severity === "low") badgeVariant = "secondary";
  const daysLabel = days != null ? `${days}d` : "--";
  const danger = days != null && days <= 3;

  return (
    <DropdownMenuItem
      className="flex items-center gap-2 cursor-pointer px-3 py-1.5"
      onClick={() => onSelect?.(p)}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{p.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {p.category}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant={badgeVariant} className="text-[10px] py-0">
            {p.stock} / {p.minStock}
          </Badge>
          {rotation?.avgDailySales != null && rotation.avgDailySales > 0 && (
            <Badge
              variant="outline"
              className={`text-[10px] py-0 ${
                danger ? "border-destructive text-destructive" : ""
              }`}
            >
              {daysLabel}
            </Badge>
          )}
        </div>
      </div>
      {onAdjust && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-[10px]"
          onClick={(e) => {
            e.stopPropagation();
            onAdjust(p);
          }}
        >
          <Wrench className="size-3" />
        </Button>
      )}
    </DropdownMenuItem>
  );
}
