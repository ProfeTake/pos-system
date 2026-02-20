import { useState, useEffect, useRef, useCallback } from "react";
import {
  FERMENTADAS,
  DESTILADAS,
  FANTASIA,
  OTROS_BASE,
  loadDynamicCategories,
} from "../../../data/categories";
import { ChevronDown, ChevronRight, Search, Check, X } from "lucide-react";
import { Button } from "../../ui/button";

interface CategoryFilterSelectProps {
  value: string; // 'all' o una categoría
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  dynamicCategories?: string[];
}

function normalize(str: string) {
  return str
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function CategoryFilterSelect({
  value,
  onChange,
  placeholder = "Todas las categorías",
  label = "Categoría",
  dynamicCategories,
}: CategoryFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [localDynamic, setLocalDynamic] = useState<string[]>([]);
  // Estado inicial: solo 'Fermentadas' expandida; el resto colapsada
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(["Destiladas", "Bebidas de Fantasía", "Otros", "Dinámicas"])
  );
  const [focusIndex, setFocusIndex] = useState(-1); // índice en flat visible

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar dinámicas y refrescar al enfocar ventana
  useEffect(() => {
    if (dynamicCategories) return;
    const load = () => setLocalDynamic(loadDynamicCategories());
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [dynamicCategories]);

  const dynamic = dynamicCategories ?? localDynamic;

  const groups = [
    { title: "Fermentadas", items: [...FERMENTADAS] as string[] },
    { title: "Destiladas", items: [...DESTILADAS] as string[] },
    { title: "Bebidas de Fantasía", items: [...FANTASIA] as string[] },
    { title: "Otros", items: [...OTROS_BASE] as string[] },
    { title: "Dinámicas", items: [...dynamic] as string[] },
  ];

  const filterItems = useCallback(
    (arr: string[]) => {
      if (!query.trim()) return arr;
      const t = normalize(query);
      return arr.filter((i) => normalize(i).includes(t));
    },
    [query]
  );

  const filtered = groups
    .map((g) => ({ ...g, filtered: filterItems(g.items) }))
    .filter((g) => g.filtered.length > 0);
  const visibleGroups = filtered.map((g) => ({
    ...g,
    collapsed: collapsed.has(g.title),
  }));
  const flat = visibleGroups
    .filter((g) => !g.collapsed)
    .flatMap((g) => g.filtered);

  const displayValue = value === "all" ? placeholder : value;

  // Click fuera
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (
        open &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  // Enfocar input al abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  const selectValue = (cat: string | "all") => {
    onChange(cat);
    setOpen(false);
    setQuery("");
    setFocusIndex(-1);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "Enter" || e.key === "ArrowDown")) {
      setOpen(true);
      return;
    }
    if (!open) return;
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
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusIndex >= 0 && flat[focusIndex]) selectValue(flat[focusIndex]);
    }
  };

  // Autoscroll focus
  useEffect(() => {
    if (focusIndex < 0) return;
    const id = `cf-cat-${normalize(flat[focusIndex])}`;
    const el = panelRef.current?.querySelector(
      `#${CSS.escape(id)}`
    ) as HTMLElement | null;
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [focusIndex, flat]);

  const highlight = (text: string) => {
    if (!query.trim()) return text;
    const t = normalize(query);
    const lower = normalize(text);
    const idx = lower.indexOf(t);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 px-0.5 rounded">
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-1" onKeyDown={handleKey}>
      {label && <label className="text-sm font-medium">{label}</label>}
      <Button
        type="button"
        variant="outline"
        className={`w-full justify-between rounded-md border border-input bg-input-background h-9 px-3 text-sm hover:bg-input-background ${value === "all" ? "text-muted-foreground" : ""
          }`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate text-left">{displayValue}</span>
        <ChevronDown className="size-4 opacity-60" />
      </Button>
      {open && (
        <div ref={panelRef} className="relative z-50">
          <div
            className="absolute mt-1 w-full rounded-md border bg-popover shadow-md p-2 max-h-80 overflow-auto animate-fade-in"
            role="listbox"
            aria-activedescendant={
              focusIndex >= 0 && flat[focusIndex]
                ? `cf-cat-${normalize(flat[focusIndex])}`
                : undefined
            }
          >
            <div className="flex items-center gap-2 mb-2 border rounded px-2 py-1 bg-background">
              <Search className="size-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setFocusIndex(-1);
                }}
                placeholder="Buscar categoría..."
                className="flex-1 bg-transparent outline-none text-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setFocusIndex(-1);
                    inputRef.current?.focus();
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <ul className="space-y-3 text-sm">
              <li>
                <button
                  type="button"
                  id="cf-cat-all"
                  role="option"
                  aria-selected={value === "all"}
                  onClick={() => selectValue("all")}
                  className={`w-full flex items-center justify-between rounded px-2 py-1 text-left transition hover:bg-accent/70 hover:text-accent-foreground ${value === "all" ? "bg-accent text-accent-foreground" : ""
                    }`}
                >
                  <span className="flex-1 truncate">{placeholder}</span>
                  {value === "all" && <Check className="size-3.5" />}
                </button>
              </li>
              {visibleGroups.length === 0 && (
                <li className="text-xs text-muted-foreground px-2">
                  Sin coincidencias.
                </li>
              )}
              {visibleGroups.map((g) => (
                <li key={g.title} className="space-y-1">
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
                    className="w-full flex items-center justify-between px-1 text-[10px] uppercase tracking-wide font-medium text-muted-foreground hover:text-foreground transition"
                  >
                    <span className="flex items-center gap-1">
                      {g.collapsed ? (
                        <ChevronRight className="size-3" />
                      ) : (
                        <ChevronDown className="size-3" />
                      )}
                      {g.title}
                    </span>
                    <span className="text-[9px] opacity-70">
                      {g.filtered.length}/{g.items.length}
                    </span>
                  </button>
                  <ul
                    className={`space-y-0.5 origin-top transition-all duration-200 ease-out overflow-hidden ${g.collapsed
                        ? "max-h-0 opacity-0 scale-y-75"
                        : "max-h-56 opacity-100 scale-y-100"
                      }`}
                  >
                    {!g.collapsed &&
                      g.filtered.map((cat) => {
                        const idx = flat.indexOf(cat);
                        const selected = value === cat;
                        const focused = focusIndex === idx;
                        return (
                          <li key={cat}>
                            <button
                              type="button"
                              id={`cf-cat-${normalize(cat)}`}
                              role="option"
                              aria-selected={selected}
                              onClick={() => selectValue(cat)}
                              className={`w-full flex items-center justify-between rounded px-2 py-1 text-left transition hover:bg-accent/70 hover:text-accent-foreground ${focused
                                  ? "bg-accent text-accent-foreground"
                                  : ""
                                }`}
                            >
                              <span className="flex-1 truncate">
                                {highlight(cat)}
                              </span>
                              {selected && <Check className="size-3.5" />}
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
