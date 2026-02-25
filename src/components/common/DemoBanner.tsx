import { isDemoMode } from "../../lib/demo";

/**
 * Badge fijo que indica al visitante que está en Modo Demo.
 * Solo se renderiza cuando el flag de demo está activo en sessionStorage.
 */
export function DemoBanner() {
  if (!isDemoMode()) return null;

  return (
    <div
      style={{ zIndex: 9999 }}
      className="fixed bottom-4 right-4 flex items-center gap-2 rounded-full bg-amber-500 px-3 py-1.5 shadow-lg select-none"
      title="Los datos mostrados son ficticios. Los cambios no se guardan."
    >
      <span className="size-2 rounded-full bg-white animate-pulse" />
      <span className="text-xs font-semibold uppercase tracking-wide text-white">
        Modo Demo
      </span>
    </div>
  );
}
