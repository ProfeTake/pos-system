import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Package, Tag, Check, Loader2 } from "lucide-react";
import { cn } from "../ui/utils";
import { apiFetchJSON } from "../../lib/api";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";

export interface ProductSuggestion {
  name: string;
  quantity: string;
  unit: string;
  category: string;
  source: "own" | "global";
  price?: number;
  barCode?: string;
}

interface ProductAutocompleteProps {
  onSelect: (product: ProductSuggestion) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  minChars?: number;
  debounceMs?: number;
  showPrice?: boolean;
  showBadge?: boolean;
}

/**
 * Componente de autocompletado para buscar productos
 * Busca en el catálogo propio del tenant y en el catálogo global
 */
export function ProductAutocomplete({
  onSelect,
  placeholder = "Buscar producto por nombre o código...",
  className,
  disabled = false,
  autoFocus = false,
  minChars = 2,
  debounceMs = 300,
  showPrice = true,
  showBadge = true,
}: ProductAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minChars) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiFetchJSON<{ suggestions: ProductSuggestion[] }>(
        `/api/products/suggestions?q=${encodeURIComponent(searchQuery)}&limit=10`
      );
      
      setSuggestions(response.suggestions || []);
      setIsOpen(response.suggestions && response.suggestions.length > 0);
      setSelectedIndex(-1);
    } catch (err) {
      console.error("Error fetching suggestions:", err);
      setError("Error al buscar sugerencias");
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, [minChars]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length >= minChars) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(query);
      }, debounceMs);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, fetchSuggestions, minChars, debounceMs]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle selection
  const handleSelect = (product: ProductSuggestion) => {
    onSelect(product);
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= minChars && suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="pl-10 pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}

      {/* Suggestions dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border bg-popover p-1 shadow-lg"
          role="listbox"
        >
          {suggestions.map((product, index) => (
            <li
              key={`${product.name}-${index}`}
              role="option"
              aria-selected={index === selectedIndex}
              className={cn(
                "flex cursor-pointer items-center justify-between rounded-sm px-3 py-2 text-sm",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
              onClick={() => handleSelect(product)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{product.name}</span>
                    {product.quantity && product.unit !== "none" && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {product.quantity}{product.unit}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Tag className="h-3 w-3" />
                    <span className="truncate">{product.category}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                {showPrice && product.price && (
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {formatPrice(product.price)}
                  </span>
                )}
                {showBadge && (
                  <Badge
                    variant={product.source === "own" ? "default" : "outline"}
                    className="text-xs"
                  >
                    {product.source === "own" ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : null}
                    {product.source === "own" ? "Tuyo" : "Sugerido"}
                  </Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* No results message */}
      {isOpen && suggestions.length === 0 && query.length >= minChars && !isLoading && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-4 text-center text-sm text-muted-foreground shadow-lg">
          No se encontraron productos para "{query}"
        </div>
      )}
    </div>
  );
}

export default ProductAutocomplete;
