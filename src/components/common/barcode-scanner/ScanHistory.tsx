/**
 * ScanHistory.tsx — Historial de escaneos en sesión
 *
 * Lista colapsable que muestra los últimos códigos escaneados
 * con timestamp, estado (exitoso/fallido) y opción de re-procesar.
 */

import { useState } from "react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  RotateCcw,
  Trash2,
  Clock,
} from "lucide-react";
import type { ScanHistoryEntry } from "../../../hooks/useBarcodeDetection";

// ============================================================
// Tipos
// ============================================================

interface ScanHistoryProps {
  /** Entradas del historial */
  entries: ScanHistoryEntry[];
  /** Callback para re-procesar un código */
  onReprocess?: (code: string) => void;
  /** Callback para limpiar historial */
  onClear?: () => void;
  /** Si es vista compacta (para fullscreen overlay) */
  compact?: boolean;
}

// ============================================================
// Componente
// ============================================================

export function ScanHistory({
  entries,
  onReprocess,
  onClear,
  compact = false,
}: ScanHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (entries.length === 0) return null;

  const displayEntries = isExpanded ? entries : entries.slice(0, 3);

  return (
    <div
      className={
        compact
          ? "bg-black/60 backdrop-blur-md rounded-lg p-2"
          : "space-y-1.5"
      }
    >
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-1.5 text-xs font-medium ${
            compact ? "text-white/80" : "text-muted-foreground"
          }`}
        >
          <Clock className="size-3" />
          Historial ({entries.length})
          {isExpanded ? (
            <ChevronUp className="size-3" />
          ) : (
            <ChevronDown className="size-3" />
          )}
        </button>
        {onClear && entries.length > 0 && (
          <button
            onClick={onClear}
            className={`text-xs flex items-center gap-1 ${
              compact
                ? "text-white/50 active:text-white/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trash2 className="size-3" />
            Limpiar
          </button>
        )}
      </div>

      {/* Lista */}
      <div
        className={`space-y-1 ${isExpanded ? "max-h-48 overflow-y-auto" : ""}`}
      >
        {displayEntries.map((entry, idx) => (
          <div
            key={`${entry.code}-${entry.timestamp}`}
            className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
              compact
                ? "bg-white/5 text-white/80"
                : "bg-muted/50 text-muted-foreground"
            }`}
          >
            {/* Indicador de estado */}
            {entry.success ? (
              <CheckCircle
                className={`size-3 shrink-0 ${
                  compact ? "text-green-400" : "text-green-500"
                }`}
              />
            ) : (
              <XCircle
                className={`size-3 shrink-0 ${
                  compact ? "text-red-400" : "text-red-500"
                }`}
              />
            )}

            {/* Código */}
            <span className="font-mono truncate flex-1">{entry.code}</span>

            {/* Badge de formato */}
            {entry.format !== "UNKNOWN" && (
              <Badge
                variant="secondary"
                className={`text-[9px] px-1 py-0 ${
                  compact ? "bg-white/10 text-white/60 border-0" : ""
                }`}
              >
                {entry.format}
              </Badge>
            )}

            {/* Timestamp */}
            <span
              className={`text-[10px] shrink-0 ${
                compact ? "text-white/40" : "text-muted-foreground/60"
              }`}
            >
              {formatTime(entry.timestamp)}
            </span>

            {/* Re-procesar */}
            {onReprocess && (
              <button
                onClick={() => onReprocess(entry.code)}
                className={`shrink-0 p-0.5 rounded ${
                  compact
                    ? "text-white/40 active:text-white/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Re-procesar código"
              >
                <RotateCcw className="size-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* "Ver más" */}
      {!isExpanded && entries.length > 3 && (
        <button
          onClick={() => setIsExpanded(true)}
          className={`text-[10px] w-full text-center py-0.5 ${
            compact ? "text-white/40" : "text-muted-foreground"
          }`}
        >
          Ver {entries.length - 3} más...
        </button>
      )}
    </div>
  );
}

// ============================================================
// Utilidades
// ============================================================

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
