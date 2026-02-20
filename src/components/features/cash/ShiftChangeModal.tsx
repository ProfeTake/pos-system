import { useState } from "react";
import { Clock, AlertTriangle, CheckCircle, X } from "lucide-react";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";

interface ShiftChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClosePreviousShift: () => void;
  onContinueSession: () => void;
  currentWindow?: {
    open: string;
    close: string;
  };
  previousWindow?: {
    open: string;
    close: string;
  };
  reason?: string;
  loading?: boolean;
}

export default function ShiftChangeModal({
  isOpen,
  onClose,
  onClosePreviousShift,
  onContinueSession,
  currentWindow,
  previousWindow,
  reason,
  loading = false,
}: ShiftChangeModalProps) {
  const [closing, setClosing] = useState(false);

  const handleClosePrevious = async () => {
    setClosing(true);
    try {
      await onClosePreviousShift();
    } finally {
      setClosing(false);
    }
  };

  const handleContinue = () => {
    onContinueSession();
    onClose();
  };

  const formatTime = (timeStr: string) => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timeStr.substring(0, 5); // HH:MM fallback
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xs p-4">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Nuevo Turno Detectado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Alert */}
          <div className="flex items-start gap-2 p-3 rounded-md border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Hemos detectado que es un nuevo turno
              </p>
              {reason && (
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  {reason}
                </p>
              )}
            </div>
          </div>

          {/* Horarios comparison */}
          {previousWindow && currentWindow && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-md border bg-slate-50 dark:bg-slate-800">
                <div>
                  <p className="text-sm font-medium">
                    Turno Anterior
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(previousWindow.open)} - {formatTime(previousWindow.close)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-2 rounded-md border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Turno Actual
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {formatTime(currentWindow.open)} - {formatTime(currentWindow.close)}
                  </p>
                </div>
                <CheckCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          )}

          {/* Opciones */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              ¿Qué deseas hacer?
            </p>
            
            <div className="grid grid-cols-1 gap-2">
              <Button
                size="sm"
                onClick={handleClosePrevious}
                disabled={loading || closing}
                className="w-full justify-start h-auto p-3"
              >
                <div className="text-left">
                  <div className="font-medium">Cerrar turno anterior</div>
                  <div className="text-xs opacity-80">
                    Recomendado - Hacer arqueo del turno anterior
                  </div>
                </div>
                {closing && (
                  <div className="ml-auto w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                )}
              </Button>

              <Button
                size="sm"
                onClick={handleContinue}
                disabled={loading || closing}
                variant="outline"
                className="w-full justify-start h-auto p-3"
              >
                <div className="text-left">
                  <div className="font-medium">
                    Continuar sesión actual
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Mantener caja abierta sin arqueo
                  </div>
                </div>
              </Button>
            </div>
          </div>

          {/* Footer note */}
          <div className="p-2 rounded-md border bg-accent/30 dark:bg-input/30">
            <p className="text-xs text-muted-foreground text-center">
              💡 Puedes cerrar este diálogo y el sistema continuará funcionando normalmente
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}