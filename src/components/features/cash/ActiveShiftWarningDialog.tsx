import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Button } from "../../ui/button";

interface ActiveShiftWarningDialogProps {
  isOpen: boolean;
  /** Timestamp ISO string or Date of when the active shift was opened */
  openedAt: string | Date | null;
  onGoToClose: () => void;
  onCancel: () => void;
}

function formatDateTime(value: string | Date | null): string {
  if (!value) return "fecha desconocida";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "fecha desconocida";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} a las ${hours}:${minutes}`;
}

export function ActiveShiftWarningDialog({
  isOpen,
  openedAt,
  onGoToClose,
  onCancel,
}: ActiveShiftWarningDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Turno en curso</DialogTitle>
          <DialogDescription>
            El turno que inició el{" "}
            <span className="font-semibold text-foreground">
              {formatDateTime(openedAt)}
            </span>{" "}
            aún no ha terminado. ¿Desea cerrar caja primero para iniciar un
            nuevo turno?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onGoToClose}>Ir a cerrar caja</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
