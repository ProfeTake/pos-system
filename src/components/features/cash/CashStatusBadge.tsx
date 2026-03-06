import { Banknote, AlertTriangle } from "lucide-react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../ui/popover";
import { useCashStatus } from "../../../hooks/CashStatusContext";

interface CashStatusBadgeProps {
  onClick: () => void;
}

/**
 * Replaces the plain "Caja" button in the header with a status-aware badge.
 * Shows a pulsing green dot when open, red when closed, amber when close-due.
 * Popover on hover shows quick summary (opening amount, window times).
 */
export function CashStatusBadge({ onClick }: CashStatusBadgeProps) {
  const { session, mustOpen, closeAt } = useCashStatus();

  const isOpen = !!session;
  const closeDue =
    isOpen && closeAt ? new Date(closeAt).getTime() <= Date.now() : false;
  const nearClose =
    isOpen && closeAt
      ? new Date(closeAt).getTime() - Date.now() < 2 * 60 * 1000 && !closeDue
      : false;

  // Color for the status dot
  const dotColor = closeDue
    ? "bg-amber-500"
    : isOpen
      ? "bg-green-500"
      : "bg-red-500";
  const dotPulse = closeDue || nearClose ? "animate-pulse" : "";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          onClick={onClick}
          variant="outline"
          className="flex items-center gap-2 relative"
        >
          <Banknote className="size-4" />
          <span className="relative flex items-center gap-1.5">
            Caja
            <span
              className={`inline-block size-2 rounded-full ${dotColor} ${dotPulse}`}
            />
          </span>
          <span className="hidden sm:inline text-xs text-muted-foreground">
            (F1)
          </span>
          {closeDue && (
            <AlertTriangle className="size-3 text-amber-500 absolute -top-1 -right-1" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-56 p-3 text-xs"
        side="bottom"
        align="end"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {isOpen ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-medium">Estado</span>
              <Badge
                variant={closeDue ? "destructive" : "default"}
                className="text-[10px] px-1.5 py-0"
              >
                {closeDue ? "Cierre pendiente" : "Abierta"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Apertura</span>
              <span>${Number(session.openingAmount || 0).toLocaleString("es-CL")}</span>
            </div>
            {session.windowClose && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cierre ventana</span>
                <span>
                  {new Date(session.windowClose).toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <span className="font-medium block">Caja cerrada</span>
            <span className="text-muted-foreground">
              {mustOpen
                ? "Debes abrir la caja para operar"
                : "Fuera de horario operativo"}
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
