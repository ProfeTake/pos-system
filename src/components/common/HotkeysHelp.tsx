import { useState, useEffect } from "react";
import { Keyboard } from "lucide-react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Separator } from "../ui/separator";

interface HotkeyItem {
  keys: string[];
  description: string;
}

interface HotkeySection {
  title: string;
  items: HotkeyItem[];
}

const hotkeysSections: HotkeySection[] = [
  {
    title: "Navegación",
    items: [
      { keys: ["Ctrl", "1"], description: "Ir a Dashboard" },
      { keys: ["Ctrl", "2"], description: "Ir a Catálogo" },
      { keys: ["Ctrl", "3"], description: "Ir a Carrito" },
      { keys: ["Ctrl", "4"], description: "Ir a Inventario" },
      { keys: ["Ctrl", "5"], description: "Ir a Ventas" },
      { keys: ["Ctrl", "6"], description: "Ir a Administración" },
      { keys: ["Ctrl", "0"], description: "Ir a SuperAdmin" },
      { keys: ["Ctrl", "B"], description: "Expandir/Contraer sidebar" },
    ],
  },
  {
    title: "Acciones Rápidas",
    items: [
      { keys: ["F1"], description: "Abrir/Cerrar caja" },
      { keys: ["F2"], description: "Calculadora de precios" },
      { keys: ["Alt", "T"], description: "Cambiar tema (claro/oscuro)" },
      { keys: ["?"], description: "Mostrar esta ayuda" },
      { keys: ["Esc"], description: "Cerrar diálogo activo" },
    ],
  },
  {
    title: "Escáner de Códigos",
    items: [
      { keys: ["Código", "Enter"], description: "Escanear y agregar producto al carrito" },
    ],
  },
  {
    title: "En Inventario",
    items: [
      { keys: ["Código", "Enter"], description: "Buscar producto para editar o crear nuevo" },
    ],
  },
];

function KeyBadge({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-semibold bg-muted border border-border rounded-md shadow-sm">
      {children}
    </kbd>
  );
}

export function HotkeysHelp() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme, systemTheme } = useTheme();

  // Escuchar teclas de atajo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si está escribiendo en un campo de texto
      const t = e.target as HTMLElement | null;
      const tag = (t?.tagName || "").toLowerCase();
      const isEditable =
        (t && (t as any).isContentEditable) ||
        tag === "input" ||
        tag === "textarea" ||
        tag === "select";
      
      if (isEditable) return;

      // ? - Mostrar ayuda
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen(true);
        return;
      }

      // Alt+T - Cambiar tema
      if (e.altKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        const current = theme === "system" ? systemTheme : theme;
        const next = current === "dark" ? "light" : "dark";
        setTheme(next);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [theme, systemTheme, setTheme]);

  return (
    <>
      {/* Botón flotante usando portal para asegurar posición correcta */}
      {createPortal(
        <Button
          onClick={() => setOpen(true)}
          size="icon"
          variant="outline"
          className="fixed z-[9999] size-11 sm:size-12 rounded-full shadow-lg border-2 bg-background hover:bg-accent hover:scale-105 transition-all"
          style={{ bottom: '24px', right: '24px' }}
          title="Atajos de teclado (?)"
        >
          <Keyboard className="size-5" />
        </Button>,
        document.body
      )}

      {/* Modal de ayuda */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg w-[95vw] sm:w-full max-h-[80vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Keyboard className="size-5" />
              Atajos de Teclado
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-5">
              {hotkeysSections.map((section, sectionIdx) => (
                <div key={section.title}>
                  {sectionIdx > 0 && <Separator className="mb-4" />}
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                    {section.title}
                  </h3>
                  <div className="space-y-2">
                    {section.items.map((item, itemIdx) => (
                      <div
                        key={itemIdx}
                        className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-sm">{item.description}</span>
                        <div className="flex items-center gap-1">
                          {item.keys.map((key, keyIdx) => (
                            <span key={keyIdx} className="flex items-center gap-1">
                              <KeyBadge>{key}</KeyBadge>
                              {keyIdx < item.keys.length - 1 && (
                                <span className="text-muted-foreground text-xs">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              Presiona <KeyBadge>?</KeyBadge> en cualquier momento para ver esta guía
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
