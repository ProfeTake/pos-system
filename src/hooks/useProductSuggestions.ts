import { useState, useCallback, useRef, useEffect } from "react";
import { apiFetchJSON } from "../lib/api";

export interface ProductSuggestion {
  name: string;
  quantity: string;
  unit: string;
  category: string;
  source: "own" | "global";
  price?: number;
  barCode?: string;
}

interface UseProductSuggestionsOptions {
  minChars?: number;
  debounceMs?: number;
  limit?: number;
}

interface UseProductSuggestionsResult {
  suggestions: ProductSuggestion[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clear: () => void;
}

/**
 * Hook para obtener sugerencias de productos
 * @param options - Opciones de configuración
 */
export function useProductSuggestions(
  options: UseProductSuggestionsOptions = {}
): UseProductSuggestionsResult {
  const { minChars = 2, debounceMs = 300, limit = 10 } = options;

  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(
    (query: string) => {
      // Cancelar búsqueda anterior
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Si el query es muy corto, limpiar
      if (query.length < minChars) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      debounceRef.current = setTimeout(async () => {
        abortControllerRef.current = new AbortController();

        try {
          const response = await apiFetchJSON<{ suggestions: ProductSuggestion[] }>(
            `/api/products/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`,
            { signal: abortControllerRef.current.signal }
          );
          setSuggestions(response.suggestions || []);
        } catch (err: any) {
          if (err.name !== "AbortError") {
            console.error("Error fetching suggestions:", err);
            setError("Error al buscar sugerencias");
            setSuggestions([]);
          }
        } finally {
          setIsLoading(false);
        }
      }, debounceMs);
    },
    [minChars, debounceMs, limit]
  );

  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setSuggestions([]);
    setIsLoading(false);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    search,
    clear,
  };
}

/**
 * Hook para búsqueda de productos con más opciones
 */
export interface SearchProductsOptions {
  includeDisabled?: boolean;
  limit?: number;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  cost: number;
  marginPct: number;
  barCode: string | null;
  ml: number | null;
  measureUnit: string | null;
  estado: string;
  supplier: string | null;
}

interface UseProductSearchResult {
  products: Product[];
  total: number;
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clear: () => void;
}

export function useProductSearch(
  options: SearchProductsOptions = {}
): UseProductSearchResult {
  const { includeDisabled = false, limit = 20 } = options;

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(
    (query: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!query || query.length < 1) {
        setProducts([]);
        setTotal(0);
        return;
      }

      setIsLoading(true);
      setError(null);

      debounceRef.current = setTimeout(async () => {
        abortControllerRef.current = new AbortController();

        try {
          const params = new URLSearchParams({
            q: query,
            limit: String(limit),
            includeDisabled: String(includeDisabled),
          });

          const response = await apiFetchJSON<{
            products: Product[];
            total: number;
          }>(`/api/products/search?${params}`, {
            signal: abortControllerRef.current.signal,
          });

          setProducts(response.products || []);
          setTotal(response.total || 0);
        } catch (err: any) {
          if (err.name !== "AbortError") {
            console.error("Error searching products:", err);
            setError("Error al buscar productos");
            setProducts([]);
            setTotal(0);
          }
        } finally {
          setIsLoading(false);
        }
      }, 300);
    },
    [includeDisabled, limit]
  );

  const clear = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setProducts([]);
    setTotal(0);
    setIsLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    products,
    total,
    isLoading,
    error,
    search,
    clear,
  };
}
