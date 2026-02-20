import { useMemo } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  RefreshCcw,
  Wrench,
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
import { Product } from "../../../types";
import { useLowStock } from "../../../hooks/useLowStock";
import { Separator } from "../../ui/separator";

// Mejoras: se eliminó lógica legacy y migración antigua.

type Props = {
  products: Product[];
  onViewed?: () => void; // se dispara cuando el usuario marca todos como vistos
  onSelectProduct?: (product: Product) => void; // abrir detalle / edición
  onAdjustProduct?: (product: Product) => void; // acción rápida de ajuste de stock
  includeNear?: boolean; // mostrar productos en riesgo (near)
};

export default function LowStockNotifications({
  products,
  onViewed,
  onSelectProduct,
  onAdjustProduct,
  includeNear = true,
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
  } = useLowStock(products, { includeNear });

  const valueAtRisk = useMemo(
    () => [...critical, ...low].reduce((s, p) => s + p.stock * p.price, 0),
    [critical, low]
  );

  const handleMarkAll = () => {
    markAllSeen();
    onViewed?.();
  };

  const totalLowCount =
    critical.length + low.length + (includeNear ? near.length : 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Notificaciones de stock"
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
      <DropdownMenuContent align="end" className="w-[380px] z-50 p-0">
        <div className="px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" />
            <span className="font-medium text-sm">Stock crítico / bajo</span>
            {loadingRotation && <Loader2 className="size-3 animate-spin" />}
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[10px]">
              {totalLowCount}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleMarkAll}
              title="Marcar todos como revisados"
            >
              <CheckCircle2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={refreshRotation}
              title="Refrescar métricas"
            >
              <RefreshCcw className="size-4" />
            </Button>
          </div>
        </div>
        <Separator />
        <div className="px-3 py-1 text-xs text-muted-foreground flex flex-wrap gap-2">
          <span>
            Valor en riesgo:{" "}
            <strong>${valueAtRisk.toLocaleString("es-CL")}</strong>
          </span>
          {unseenCount > 0 && (
            <span className="text-destructive">
              Nuevos: <strong>{unseenCount}</strong>
            </span>
          )}
        </div>
        <Separator />
        {critical.length === 0 &&
          low.length === 0 &&
          (!includeNear || near.length === 0) && (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              No hay productos con stock bajo.
            </div>
          )}
        <div className="max-h-80 overflow-auto py-1">
          {critical.length > 0 && (
            <SectionHeader
              label="Crítico"
              count={critical.length}
              icon={<ShieldAlert className="size-3 text-destructive" />}
            />
          )}
          {critical.map((p) => (
            <ProductItem
              key={p.id}
              p={p}
              severity="critical"
              rotation={rotationMap[String(p.id)]}
              onSelect={onSelectProduct}
              onAdjust={onAdjustProduct}
            />
          ))}
          {low.length > 0 && <SectionHeader label="Bajo" count={low.length} />}
          {low.map((p) => (
            <ProductItem
              key={p.id}
              p={p}
              severity="low"
              rotation={rotationMap[String(p.id)]}
              onSelect={onSelectProduct}
              onAdjust={onAdjustProduct}
            />
          ))}
          {includeNear && near.length > 0 && (
            <SectionHeader label="En riesgo" count={near.length} />
          )}
          {includeNear &&
            near.map((p) => (
              <ProductItem
                key={p.id}
                p={p}
                severity="near"
                rotation={rotationMap[String(p.id)]}
                onSelect={onSelectProduct}
                onAdjust={onAdjustProduct}
              />
            ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Subcomponent: encabezado de sección
function SectionHeader({
  label,
  count,
  icon,
}: {
  label: string;
  count: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="px-3 pt-2 pb-1 flex items-center justify-between">
      <div className="flex items-center gap-1 text-xs font-semibold">
        {icon}
        <span>{label}</span>
      </div>
      <Badge variant="outline" className="text-[10px]">
        {count}
      </Badge>
    </div>
  );
}

type Severity = "critical" | "low" | "near";
interface ProductItemProps {
  p: Product;
  severity: Severity;
  rotation?: { avgDailySales?: number | null; daysOfStock?: number | null };
  onSelect?: (p: Product) => void;
  onAdjust?: (p: Product) => void;
}

function ProductItem({
  p,
  severity,
  rotation,
  onSelect,
  onAdjust,
}: ProductItemProps) {
  const days = rotation?.daysOfStock;
  let badgeVariant: "destructive" | "secondary" | "outline" = "outline";
  if (severity === "critical") badgeVariant = "destructive";
  else if (severity === "low") badgeVariant = "secondary";
  else badgeVariant = "outline";
  const daysLabel = days != null ? `${days}d` : "--";
  const danger = days != null && days <= 3;
  return (
    <DropdownMenuItem
      className="flex items-center gap-3 cursor-pointer px-3 py-2"
      onClick={() => onSelect?.(p)}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{p.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">
          {p.category}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={badgeVariant} className="text-[10px]">
            {p.stock} / {p.minStock} mín.
          </Badge>
          {rotation?.avgDailySales != null && rotation.avgDailySales > 0 && (
            <Badge
              variant="outline"
              className={`text-[10px] ${danger ? "border-destructive text-destructive" : ""
                }`}
            >
              {daysLabel}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1 items-end">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[10px]"
          onClick={(e) => {
            e.stopPropagation();
            onAdjust?.(p);
          }}
        >
          <Wrench className="size-3 mr-1" /> Ajustar
        </Button>
        <div className="text-[10px] text-muted-foreground">
          ${(p.stock * p.price).toLocaleString("es-CL")}
        </div>
      </div>
    </DropdownMenuItem>
  );
}
