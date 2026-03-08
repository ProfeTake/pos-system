/**
 * ManualInput.tsx — Input de búsqueda manual y selector de cantidad
 *
 * Componente para búsqueda manual de productos por nombre, categoría o código:
 *   - Input con autocompletado local
 *   - Búsqueda remota al backend cuando no hay match local
 *   - Selector de cantidad
 *   - Lista de resultados con botón de agregar
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Search, Plus, X, Copy } from "lucide-react";
import { Product } from "../../../types";
import { toast } from "sonner";
import { apiFetchJSON } from "../../../lib/api";

// ============================================================
// Tipos
// ============================================================

interface ManualInputProps {
  /** Productos en memoria */
  products: Product[];
  /** Contexto: "cart" o "inventory" */
  context: "cart" | "inventory";
  /** Callback al encontrar/seleccionar un producto */
  onProductFound: (product: Product) => void;
  /** Callback para código no encontrado en inventario */
  onBarcodeForInventory?: (barcode: string) => void;
  /** Cantidad seleccionada */
  quantity: number;
  /** Callback para cambiar cantidad */
  onQuantityChange: (qty: number) => void;
  /** Si la vista es compacta (fullscreen mode — controles mínimos) */
  compact?: boolean;
  /** Si el componente es visible (para auto-focus) */
  isVisible?: boolean;
}

// ============================================================
// Componente
// ============================================================

export function ManualInput({
  products,
  context,
  onProductFound,
  onBarcodeForInventory,
  quantity,
  onQuantityChange,
  compact = false,
  isVisible = true,
}: ManualInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus
  useEffect(() => {
    if (isVisible && inputRef.current && !compact) {
      inputRef.current.focus();
    }
  }, [isVisible, compact]);

  // ============================================================
  // Búsqueda local
  // ============================================================

  const filterLocal = useCallback(
    (query: string) => {
      const term = query.trim().toLowerCase();
      if (!term) {
        setSearchResults([]);
        return;
      }
      const results = products.filter((p) => {
        if (p.estado === "DESHABILITADO") return false;
        const name = p.name?.toLowerCase() || "";
        const cat = p.category?.toLowerCase() || "";
        const code = p.barCode?.toLowerCase() || "";
        return (
          name.includes(term) || cat.includes(term) || code.includes(term)
        );
      });
      setSearchResults(results);
    },
    [products]
  );

  // ============================================================
  // Búsqueda remota
  // ============================================================

  const searchBackend = useCallback(
    async (code: string) => {
      try {
        const product = await apiFetchJSON<Product>(
          `/api/products/by-barcode/${encodeURIComponent(code)}`
        );
        if (product) {
          onProductFound(product);
          setInputValue("");
          setSearchResults([]);
          if (context !== "cart") {
            toast.info("Producto encontrado en backend (no estaba en memoria)");
          }
        }
      } catch (err: any) {
        if (err?.status === 404 || err?.message?.includes("404")) {
          if (context === "inventory" && onBarcodeForInventory) {
            onBarcodeForInventory(code);
            setInputValue("");
            setSearchResults([]);
          } else {
            toast.error("Producto no encontrado");
          }
        } else {
          if (context === "inventory" && onBarcodeForInventory) {
            onBarcodeForInventory(code);
            setInputValue("");
            setSearchResults([]);
          } else {
            toast.error("No fue posible consultar el backend");
          }
        }
      }
    },
    [context, onBarcodeForInventory, onProductFound]
  );

  // ============================================================
  // Handlers
  // ============================================================

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      filterLocal(value);

      if (value.length >= 6) {
        const val = value.trim();
        const exactMatch = products.find(
          (p) => p.barCode === val && p.estado !== "DESHABILITADO"
        );
        if (exactMatch) {
          onProductFound(exactMatch);
          setInputValue("");
          setSearchResults([]);
          return;
        }
        searchBackend(val);
      }
    },
    [filterLocal, products, onProductFound, searchBackend]
  );

  const handleEnterPress = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    if (searchResults.length === 1) {
      onProductFound(searchResults[0]);
      setInputValue("");
      setSearchResults([]);
    } else if (searchResults.length > 1) {
      toast.error("Múltiples productos encontrados. Selecciona uno.");
    } else {
      toast.error("Producto no encontrado");
    }
  };

  const clearInput = () => {
    setInputValue("");
    setSearchResults([]);
    inputRef.current?.focus();
  };

  const handleCopy = async () => {
    const code = inputValue.trim();
    if (!code) {
      toast.error("No hay código para copiar");
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Código copiado: ${code}`);
    } catch {
      toast.message(`Código: ${code}`, {
        description: "No se pudo copiar automáticamente.",
      });
    }
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {!compact && (
        <label className="text-sm text-muted-foreground">
          Código o Búsqueda
        </label>
      )}

      {/* Input de búsqueda */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Nombre o código..."
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleEnterPress}
            className="pl-7 h-8 text-sm"
            autoComplete="off"
          />
          {inputValue && (
            <button
              type="button"
              aria-label="Limpiar búsqueda"
              onClick={clearInput}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Cantidad + acciones */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Cant:</label>
        <Input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) =>
            onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))
          }
          className="w-16 h-8 text-sm"
        />
        <Button size="sm" onClick={clearInput} variant="outline">
          Limpiar
        </Button>
        <Button
          size="sm"
          onClick={handleCopy}
          variant="secondary"
          title="Copiar código al portapapeles"
        >
          <Copy className="size-3" />
        </Button>
      </div>

      {/* Lista de resultados */}
      {searchResults.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm">
            Resultados ({searchResults.length})
          </h4>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {searchResults.map((product, idx) => (
              <div
                key={product.id}
                className="p-2 border rounded-md text-sm"
                style={{
                  animation: `fadeInUp 250ms ease-out ${idx * 35}ms both`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-0.5">
                      <span className="font-medium truncate text-xs">
                        {product.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1"
                      >
                        {product.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Stock: {product.stock}</span>
                      <span className="font-medium text-foreground">
                        ${product.price.toLocaleString("es-CL")}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      onProductFound(product);
                      setInputValue("");
                      setSearchResults([]);
                    }}
                    disabled={
                      product.stock <= 0 ||
                      product.estado === "DESHABILITADO"
                    }
                    className="h-7 text-xs"
                  >
                    <Plus className="size-3 mr-1" />
                    Agregar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
