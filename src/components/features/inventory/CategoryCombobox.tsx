import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import {
  ChevronsUpDown,
  PlusCircle,
  X,
  Search,
  Check,
  ChevronDown,
  ChevronRight,
  Trash2,
  RotateCcw,
  Sparkles,
  Tag,
  FolderOpen,
  Zap,
} from "lucide-react";

export interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Datos base compartidos
import {
  FERMENTADAS,
  DESTILADAS,
  FANTASIA,
  OTROS_BASE,
  LS_DYNAMIC_CATEGORIES_KEY,
  getAllCategoryGroups,
  type CategoryGroup,
} from "../../../data/categories";

// Utils
function normalize(str: string) {
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
const capitalize = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// LocalStorage keys
const LS_DYNAMIC = LS_DYNAMIC_CATEGORIES_KEY;
const LS_COLLAPSED = "cat_groups_collapsed_v2";

// Iconos por grupo para mejor UX
const GROUP_ICONS: Record<string, React.ReactNode> = {
  Fermentadas: <Sparkles className="size-3" />,
  Destiladas: <Zap className="size-3" />,
  "Bebidas de Fantasía": <Tag className="size-3" />,
  Otros: <FolderOpen className="size-3" />,
  Dinámicas: <PlusCircle className="size-3" />,
};

// Colores por grupo para badges
const GROUP_COLORS: Record<string, string> = {
  Fermentadas: "bg-purple-100 text-purple-700 border-purple-200",
  Destiladas: "bg-amber-100 text-amber-700 border-amber-200",
  "Bebidas de Fantasía": "bg-pink-100 text-pink-700 border-pink-200",
  Otros: "bg-gray-100 text-gray-700 border-gray-200",
  Dinámicas: "bg-blue-100 text-blue-700 border-blue-200",
};

export function CategoryCombobox({
  value,
  onChange,
  placeholder = "Seleccionar categoría",
  disabled = false,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [otrosDynamic, setOtrosDynamic] = useState<string[]>([]); // solo agregadas por el usuario (ordenadas por uso reciente)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [focusIndex, setFocusIndex] = useState(-1);
  const [activeGroup, setActiveGroup] = useState<string | null>(null); // último grupo navegado
  const [justCreated, setJustCreated] = useState<string | null>(null); // para animación de elemento recién creado
  const [pendingDelete, setPendingDelete] = useState<string | null>(null); // categoría pendiente de eliminar
  const [pendingReset, setPendingReset] = useState(false); // confirmación de reset

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  }>({ top: 0, left: 0, width: 0, maxHeight: 320 });

  // Posicionamiento: si estamos dentro de un dialog, usar coordenadas relativas al dialog.
  const [inDialog, setInDialog] = useState(false);
  const [dialogEl, setDialogEl] = useState<HTMLElement | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const isMobile = window.innerWidth < 640;

    if (isMobile) {
      // En móvil: siempre fixed al body, panel de ancho completo con márgenes
      const tRect = trigger.getBoundingClientRect();
      const horizontalPad = 16;
      const panelWidth = window.innerWidth - horizontalPad * 2;
      const left = horizontalPad;

      const availableBelow = window.innerHeight - tRect.bottom - 16;
      const availableAbove = tRect.top - 16;
      const useBelow = availableBelow >= 180 || availableBelow >= availableAbove;
      let top: number;
      let maxHeight: number;
      if (useBelow) {
        top = tRect.bottom + 6;
        maxHeight = Math.max(200, Math.min(availableBelow - 6, 440));
      } else {
        maxHeight = Math.max(200, Math.min(availableAbove - 6, 440));
        top = tRect.top - maxHeight - 6;
      }
      setCoords({ top, left, width: panelWidth, maxHeight });
      setInDialog(false);
      setDialogEl(null);
      return;
    }

    const dlg = trigger.closest('[role="dialog"]') as HTMLElement | null;
    if (dlg) {
      // posicion absoluta relativa al dialog
      const tRect = trigger.getBoundingClientRect();
      const dRect = dlg.getBoundingClientRect();
      const width = tRect.width;
      let left = tRect.left - dRect.left;
      let top = tRect.bottom - dRect.top + 8;
      const maxLeft = dRect.width - width - 16;
      if (left > maxLeft) left = Math.max(16, maxLeft);

      // Calcular altura máxima disponible dentro del dialog
      const availableHeight = dRect.bottom - tRect.bottom - 24;
      const maxHeight = Math.min(Math.max(availableHeight, 150), 320);

      setCoords({ top, left, width, maxHeight });
      setInDialog(true);
      setDialogEl(dlg);
    } else {
      // fallback: posición fija en el viewport
      const rect = trigger.getBoundingClientRect();
      const width = rect.width;
      let left = rect.left;
      let top = rect.bottom + 8;
      const maxLeft = window.innerWidth - width - 16;
      if (left > maxLeft) left = Math.max(16, maxLeft);

      // Calcular altura máxima disponible en el viewport
      const availableHeight = window.innerHeight - rect.bottom - 24;
      const maxHeight = Math.min(Math.max(availableHeight, 150), 384);

      setCoords({ top, left, width, maxHeight });
      setInDialog(false);
      setDialogEl(null);
    }
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onScrollGlobal = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScrollGlobal, true);
    window.addEventListener("resize", onResize);
    // si estamos en un dialog, escuchar scroll del dialog para recalcular
    let dialogScrollEl: HTMLElement | null = null;
    if (dialogEl) {
      dialogScrollEl = dialogEl.querySelector(
        "[data-dialog-scroll]"
      ) as HTMLElement | null;
      // si no existe usamos el dialog completo
      if (!dialogScrollEl) dialogScrollEl = dialogEl;
      dialogScrollEl.addEventListener("scroll", updatePosition, true);
    }
    return () => {
      window.removeEventListener("scroll", onScrollGlobal, true);
      window.removeEventListener("resize", onResize);
      if (dialogScrollEl)
        dialogScrollEl.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition, dialogEl]);

  // Hidratar persistencia
  useEffect(() => {
    try {
      const rawDyn = localStorage.getItem(LS_DYNAMIC);
      if (rawDyn) {
        const arr = JSON.parse(rawDyn);
        if (Array.isArray(arr)) {
          const baseAll = [
            ...FERMENTADAS,
            ...DESTILADAS,
            ...FANTASIA,
            ...OTROS_BASE,
          ];
          const baseMap = new Map(baseAll.map((b) => [normalize(b), b]));
          const filteredDyn: string[] = [];
          const removed: string[] = [];
          for (const c of arr) {
            if (typeof c !== "string") continue;
            const norm = normalize(c);
            if (baseMap.has(norm)) {
              removed.push(c);
            } else if (!filteredDyn.some((d) => normalize(d) === norm)) {
              filteredDyn.push(c);
            }
          }
          if (removed.length > 0) {
            try {
              localStorage.setItem(LS_DYNAMIC, JSON.stringify(filteredDyn));
            } catch {
              /* ignore */
            }
          }
          setOtrosDynamic(filteredDyn);
        }
      }
      const rawCol = localStorage.getItem(LS_COLLAPSED);
      if (rawCol) {
        const arr = JSON.parse(rawCol);
        if (Array.isArray(arr))
          setCollapsed(
            new Set(arr.filter((c: unknown) => typeof c === "string"))
          );
      }
    } catch {
      /* ignore */
    }
    setFocusIndex(-1);
  }, []);

  // Persistir dinámicos
  useEffect(() => {
    try {
      localStorage.setItem(LS_DYNAMIC, JSON.stringify(otrosDynamic));
    } catch {
      /*ignore*/
    }
  }, [otrosDynamic]);
  // Persistir colapsados
  useEffect(() => {
    try {
      localStorage.setItem(LS_COLLAPSED, JSON.stringify(Array.from(collapsed)));
    } catch {
      /*ignore*/
    }
  }, [collapsed]);

  const filterItems = useCallback(
    (arr: string[]) => {
      if (!query.trim()) return arr;
      const t = normalize(query);
      return arr.filter((i) => normalize(i).includes(t));
    },
    [query]
  );

  // Generar grupos con categorías dinámicas
  const grupos = useMemo(
    () => getAllCategoryGroups(otrosDynamic),
    [otrosDynamic]
  );

  // Tipo extendido para grupos filtrados
  type FilteredGroup = CategoryGroup & { filtered: string[] };

  const filteredGroups = useMemo(
    () =>
      grupos
        .map(
          (g: CategoryGroup): FilteredGroup => ({
            ...g,
            filtered: filterItems(g.items),
          })
        )
        .filter((g: FilteredGroup) => g.filtered.length > 0),
    [grupos, filterItems]
  );

  const visibleGroups = useMemo(
    () =>
      filteredGroups.map((g: CategoryGroup & { filtered: string[] }) => ({
        ...g,
        collapsed: collapsed.has(g.title),
      })),
    [filteredGroups, collapsed]
  );

  const flat = useMemo(
    () =>
      visibleGroups
        .filter(
          (g: CategoryGroup & { filtered: string[]; collapsed: boolean }) =>
            !g.collapsed
        )
        .flatMap(
          (g: CategoryGroup & { filtered: string[]; collapsed: boolean }) =>
            g.filtered
        ),
    [visibleGroups]
  );

  const exists = useMemo(
    () =>
      grupos
        .flatMap((g: CategoryGroup) => g.items)
        .some((c: string) => normalize(c) === normalize(query || value || "")),
    [grupos, query, value]
  );

  const selectCat = (cat: string) => {
    // Recency para dinámicos
    if (
      !([...OTROS_BASE] as string[]).includes(cat) &&
      otrosDynamic.includes(cat)
    ) {
      setOtrosDynamic((prev: string[]) => [
        cat,
        ...prev.filter((c: string) => c !== cat),
      ]);
    }
    onChange(cat);
    setQuery("");
    setOpen(false);
    setFocusIndex(-1);
  };

  const createCat = () => {
    if (!query.trim()) return;
    const newCat = capitalize(query.trim());
    const baseAll = [...FERMENTADAS, ...DESTILADAS, ...FANTASIA, ...OTROS_BASE];
    const matchBase = baseAll.find((b) => normalize(b) === normalize(newCat));
    if (matchBase) {
      selectCat(matchBase);
      return;
    }
    setOtrosDynamic((prev: string[]) => [
      newCat,
      ...prev.filter((c: string) => normalize(c) !== normalize(newCat)),
    ]);
    setJustCreated(newCat);
    setTimeout(() => setJustCreated(null), 2000);
    selectCat(newCat);
  };

  const requestDelete = (cat: string) => setPendingDelete(cat);
  const requestReset = () => setPendingReset(true);
  const performPending = () => {
    if (pendingDelete) {
      setOtrosDynamic((prev) => prev.filter((c) => c !== pendingDelete));
      if (normalize(value) === normalize(pendingDelete)) onChange("");
    }
    if (pendingReset) {
      setOtrosDynamic([]);
      setCollapsed(new Set());
      try {
        localStorage.removeItem(LS_DYNAMIC);
        localStorage.removeItem(LS_COLLAPSED);
      } catch {
        /* ignore */
      }
      setFocusIndex(-1);
    }
    setPendingDelete(null);
    setPendingReset(false);
  };
  const cancelPending = () => {
    setPendingDelete(null);
    setPendingReset(false);
  };

  // Cerrar por click fuera
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!open) return;
      const insidePanel = panelRef.current?.contains(t);
      const insideTrigger = triggerRef.current?.contains(t);
      if (!insidePanel && !insideTrigger) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // Foco robusto: doble rAF para esperar que el portal se monte/mueva antes de enfocar
  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    });
  }, []);

  useEffect(() => {
    if (open) focusInput();
  }, [open, focusInput]);

  // Re-enfocar si el portal se mueve (inDialog cambia mientras está abierto)
  useEffect(() => {
    if (open) focusInput();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inDialog]);  

  // Keyboard navigation
  const handleKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      if (!disabled) setOpen(true);
      return;
    }
    if (!open) return;

    // Atajos Alt+N
    if (e.altKey) {
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num > 0) {
        const target = visibleGroups[num - 1];
        if (target) {
          e.preventDefault();
          // Expandir si estaba colapsado
          if (collapsed.has(target.title)) {
            setCollapsed((prev) => {
              const n = new Set(prev);
              n.delete(target.title);
              return n;
            });
          }
          setActiveGroup(target.title);
          // Scroll al encabezado
          const el = panelRef.current?.querySelector(
            `#group-${normalize(target.title)}`
          ) as HTMLElement | null;
          el?.scrollIntoView({ block: "start", behavior: "smooth" });
          const firstInGroup = target.filtered[0];
          if (firstInGroup) {
            const idxInFlat = flat.indexOf(firstInGroup);
            if (idxInFlat >= 0) setFocusIndex(idxInFlat);
          }
        }
      }
    }
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "ArrowLeft") {
      if (focusIndex >= 0) {
        for (const g of visibleGroups) {
          if (
            !g.collapsed &&
            g.filtered.some((it: string) => flat.indexOf(it) === focusIndex)
          ) {
            setCollapsed((prev) => new Set(prev).add(g.title));
            setFocusIndex(-1);
            break;
          }
        }
      }
    } else if (e.key === "ArrowRight") {
      for (const g of visibleGroups) {
        if (g.collapsed) {
          setCollapsed((prev) => {
            const n = new Set(prev);
            n.delete(g.title);
            return n;
          });
          break;
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusIndex >= 0 && flat[focusIndex]) selectCat(flat[focusIndex]);
      else if (!exists && query.trim()) createCat();
    }
  };

  // Auto scroll
  useEffect(() => {
    if (focusIndex < 0) return;
    const id = `cat-${normalize(flat[focusIndex] || "")}`;
    const el = panelRef.current?.querySelector(
      `#${CSS.escape(id)}`
    ) as HTMLElement | null;
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [focusIndex, flat]);

  const highlight = (text: string) => {
    if (!query.trim()) return text;
    const t = normalize(query);
    const low = normalize(text);
    const idx = low.indexOf(t);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 dark:bg-yellow-500/30 px-0.5 rounded font-medium">
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  // Determinar el grupo de la categoría actual
  const currentGroup = useMemo(() => {
    if (!value) return null;
    for (const g of grupos) {
      if (
        g.items.some((item: string) => normalize(item) === normalize(value))
      ) {
        return g.title;
      }
    }
    return null;
  }, [value, grupos]);

  return (
    <div className="relative" ref={triggerRef} onKeyDown={handleKey}>
      <Button
        type="button"
        variant="outline"
        className={`w-full justify-between transition-all hover:border-primary/50 ${
          open ? "ring-2 ring-primary/20 border-primary" : ""
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={() => {
          if (disabled) return;
          const opening = !open;
          setOpen((o) => !o);
          if (opening) focusInput();
        }}
        disabled={disabled}
      >
        <span className="flex items-center gap-2 flex-1 truncate">
          {value ? (
            <>
              {currentGroup && (
                <span
                  className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded border ${
                    GROUP_COLORS[currentGroup] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {GROUP_ICONS[currentGroup]}
                </span>
              )}
              <span className="font-medium">{value}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronsUpDown
          className={`size-4 opacity-60 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </Button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            className={`${
              inDialog ? "absolute" : "fixed"
            } z-[9999] rounded-lg border bg-popover shadow-xl p-3 overflow-hidden flex flex-col animate-in fade-in-0 slide-in-from-top-2 duration-200`}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxHeight: `${coords.maxHeight}px`,
            }}
            role="listbox"
            aria-activedescendant={
              focusIndex >= 0 && flat[focusIndex]
                ? `cat-${normalize(flat[focusIndex])}`
                : undefined
            }
          >
            {/* Barra de búsqueda compacta */}
            <div className="flex items-center gap-2 mb-2 border rounded-md px-2.5 py-1.5 bg-background/50 backdrop-blur-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all shrink-0">
              <Search className="size-3.5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setFocusIndex(-1);
                }}
                placeholder="Buscar o crear..."
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setFocusIndex(-1);
                    inputRef.current?.focus();
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5 hover:bg-muted rounded"
                  title="Limpiar búsqueda"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Navegación rápida de grupos - más compacta */}
            {visibleGroups.length > 1 && (
              <nav className="flex flex-wrap gap-1 mb-2 pb-2 border-b shrink-0">
                {visibleGroups.map(
                  (
                    g: CategoryGroup & {
                      filtered: string[];
                      collapsed: boolean;
                    },
                    i: number
                  ) => {
                    const isActive = activeGroup === g.title;
                    const groupColor =
                      GROUP_COLORS[g.title] || "bg-gray-100 text-gray-700";
                    return (
                      <button
                        key={g.title}
                        type="button"
                        onClick={() => {
                          if (collapsed.has(g.title)) {
                            setCollapsed((prev) => {
                              const n = new Set(prev);
                              n.delete(g.title);
                              return n;
                            });
                          }
                          setActiveGroup(g.title);
                          const el = panelRef.current?.querySelector(
                            `#group-${normalize(g.title)}`
                          ) as HTMLElement | null;
                          el?.scrollIntoView({
                            block: "start",
                            behavior: "smooth",
                          });
                        }}
                        className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-md border text-[11px] font-medium transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                          isActive
                            ? `${groupColor} shadow-sm`
                            : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                        } ${collapsed.has(g.title) ? "opacity-50" : ""}`}
                        title={`${g.title} (Alt+${i + 1})`}
                      >
                        {GROUP_ICONS[g.title]}
                        <span className="max-w-[80px] sm:max-w-[60px] truncate">{g.title}</span>
                        <span className="text-[9px] opacity-70">
                          {g.filtered.length}
                        </span>
                      </button>
                    );
                  }
                )}
              </nav>
            )}

            {/* Lista de categorías - área scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 text-sm scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
              {visibleGroups.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="size-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No hay coincidencias</p>
                  <p className="text-xs mt-1">Intenta con otro término</p>
                </div>
              )}
              {visibleGroups.map(
                (
                  g: CategoryGroup & { filtered: string[]; collapsed: boolean }
                ) => (
                  <div
                    key={g.title}
                    className="space-y-0.5"
                    id={`group-${normalize(g.title)}`}
                  >
                    <button
                      type="button"
                      aria-expanded={!g.collapsed}
                      onClick={() =>
                        setCollapsed((prev) => {
                          const n = new Set(prev);
                          if (n.has(g.title)) n.delete(g.title);
                          else n.add(g.title);
                          setFocusIndex(-1);
                          return n;
                        })
                      }
                      className="w-full flex items-center justify-between px-2 py-1 text-[11px] uppercase tracking-wide font-semibold text-muted-foreground hover:text-foreground transition-all hover:bg-muted/50 rounded group"
                    >
                      <span className="flex items-center gap-1">
                        {g.collapsed ? (
                          <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                        ) : (
                          <ChevronDown className="size-3 transition-transform" />
                        )}
                        {GROUP_ICONS[g.title]}
                        <span>{g.title}</span>
                      </span>
                      <span className="text-[9px] font-normal opacity-70 bg-muted px-1 py-0.5 rounded">
                        {g.filtered.length}
                      </span>
                    </button>
                    <ul
                      className={`space-y-0 origin-top transition-all duration-200 ease-out overflow-hidden ${
                        g.collapsed
                          ? "max-h-0 opacity-0"
                          : "max-h-[500px] opacity-100"
                      }`}
                      role="group"
                      aria-label={g.title}
                    >
                      {!g.collapsed &&
                        g.filtered.map((cat: string) => {
                          const idx = flat.indexOf(cat);
                          const selected = normalize(value) === normalize(cat);
                          const focused = focusIndex === idx;
                          const isDynamic = otrosDynamic.includes(cat);
                          const isDynamicGroup = g.title === "Dinámicas";
                          const isJustCreated = justCreated === cat;
                          return (
                            <li key={cat} role="none">
                              <button
                                type="button"
                                onClick={() => selectCat(cat)}
                                id={`cat-${normalize(cat)}`}
                                role="option"
                                aria-selected={selected}
                                className={`group/item w-full flex items-center gap-1.5 rounded px-2 py-1.5 text-left text-sm transition-all hover:bg-accent hover:text-accent-foreground focus:outline-none relative overflow-hidden ${
                                  focused
                                    ? "bg-accent text-accent-foreground ring-1 ring-primary/20"
                                    : ""
                                } ${
                                  selected
                                    ? "bg-primary/10 text-primary font-medium"
                                    : ""
                                } ${
                                  isJustCreated
                                    ? "animate-in slide-in-from-left-4 duration-200"
                                    : ""
                                }`}
                              >
                                {isJustCreated && (
                                  <span className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent animate-pulse" />
                                )}
                                <span className="flex-1 truncate relative z-10">
                                  {highlight(cat)}
                                </span>
                                {isDynamic && !isDynamicGroup && (
                                  <span
                                    title="Categoría personalizada"
                                    className="text-[8px] px-1 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 font-medium"
                                  >
                                    Custom
                                  </span>
                                )}
                                {selected && (
                                  <Check className="size-3.5 shrink-0 text-primary" />
                                )}
                                {isDynamic && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      requestDelete(cat);
                                    }}
                                    className="opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 p-0.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                                    title="Eliminar categoría"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                )}
                              </button>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )
              )}

              {/* Botón crear nueva categoría */}
              {query.trim() && !exists && (
                <div className="pt-2 border-t">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full h-8 justify-start gap-1.5 text-sm hover:bg-primary hover:text-primary-foreground transition-all"
                    onClick={createCat}
                  >
                    <PlusCircle className="size-3.5" />
                    <span className="flex-1 text-left">
                      Crear{" "}
                      <span className="font-semibold">"{query.trim()}"</span>
                    </span>
                    <span className="text-[10px] opacity-70">Enter ↵</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Footer con estadísticas - más compacto */}
            <div className="pt-2 mt-2 border-t flex items-center justify-between gap-2 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1 hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={requestReset}
                title="Restablecer todas las categorías personalizadas"
              >
                <RotateCcw className="size-3" />
                <span className="hidden sm:inline">Restablecer</span>
              </Button>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded">
                  <Tag className="size-2.5" />
                  <span className="font-medium">{otrosDynamic.length}</span>
                </span>
                {query && (
                  <span className="flex items-center gap-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    <Search className="size-2.5" />
                    <span className="font-medium">
                      {visibleGroups.reduce(
                        (
                          acc: number,
                          g: CategoryGroup & { filtered: string[] }
                        ) => acc + g.filtered.length,
                        0
                      )}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>,
          inDialog && dialogEl ? dialogEl : document.body
        )}
      {/* Modales de confirmación mejorados */}
      <Dialog
        open={!!pendingDelete}
        onOpenChange={() => setPendingDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-destructive" />
              Eliminar categoría
            </DialogTitle>
            <DialogDescription className="pt-2">
              ¿Estás seguro de eliminar la categoría{" "}
              <span className="font-semibold text-foreground">
                "{pendingDelete}"
              </span>
              ? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={performPending}
              className="gap-2"
            >
              <Trash2 className="size-4" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={pendingReset} onOpenChange={() => setPendingReset(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="size-5 text-orange-600" />
              Restablecer categorías
            </DialogTitle>
            <DialogDescription className="pt-2">
              Se eliminarán todas las{" "}
              <span className="font-semibold text-foreground">
                {otrosDynamic.length} categorías personalizadas
              </span>{" "}
              y se restablecerá el estado de los grupos. Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={performPending}
              className="gap-2"
            >
              <RotateCcw className="size-4" />
              Restablecer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
