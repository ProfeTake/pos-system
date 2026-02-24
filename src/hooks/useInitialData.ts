import { useState, useEffect, useCallback, useRef } from "react";
import { productService } from "../services/product.service";
import { salesService } from "../services/sales.service";
import { Product, Sale } from "../types";
import { toast } from "sonner";

/**
 * Hook to manage initial data fetching (Products and Sales).
 *
 * Centralizes the logic for populating the application's main data stores.
 * Uses `productService` and `salesService` to fetch data from the backend.
 *
 * @returns An object containing:
 * - `products`: List of products.
 * - `setProducts`: State setter for products.
 * - `sales`: List of sales history.
 * - `setSales`: State setter for sales.
 * - `refreshAll`: Function to re-fetch both products and sales.
 * - `fetchProducts`: Function to re-fetch only products.
 * - `fetchSales`: Function to re-fetch only sales.
 */
export function useInitialData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // Refs para control de estado
  const mountedRef = useRef(true);
  const fetchingProductsRef = useRef(false);
  const fetchingSalesRef = useRef(false);
  const initialLoadDoneRef = useRef(false);

  const fetchProducts = useCallback(async () => {
    // Evitar llamadas duplicadas
    if (fetchingProductsRef.current || !mountedRef.current) return;
    fetchingProductsRef.current = true;

    try {
      const data = await productService.getAll();
      if (Array.isArray(data) && mountedRef.current) {
        setProducts(data);
      }
    } catch (error) {
      if (!mountedRef.current) return;
      console.error("Error fetching products:", error);
      toast.error("Error al cargar productos");
    } finally {
      fetchingProductsRef.current = false;
    }
  }, []);

  const fetchSales = useCallback(async () => {
    // Evitar llamadas duplicadas
    if (fetchingSalesRef.current || !mountedRef.current) return;
    fetchingSalesRef.current = true;

    try {
      const data = await salesService.getAll();
      if (Array.isArray(data) && mountedRef.current) {
        // Mapear createdAt a date y convertir a Date object
        const mappedSales = data
          .filter((sale: any) => sale && (sale.createdAt || sale.date)) // Filtrar ventas sin fecha
          .map((sale: any) => {
            const dateValue = sale.createdAt || sale.date;
            // MySQL returns ISO date strings; keep numeric fallback for legacy data
            const dateObj =
              typeof dateValue === "number"
                ? new Date(dateValue * 1000)
                : new Date(dateValue);

            return {
              ...sale,
              date: dateObj,
              items: (sale.items || []).map((item: any) => ({
                ...item,
                product: {
                  id: item.productId,
                  name: item.productName,
                  price: item.price,
                },
              })),
            };
          });
        setSales(mappedSales);
      }
    } catch (error) {
      if (!mountedRef.current) return;
      console.error("Error fetching sales:", error);
    } finally {
      fetchingSalesRef.current = false;
    }
  }, []);

  const refreshAll = useCallback(() => {
    if (!mountedRef.current) return;
    fetchProducts();
    fetchSales();
  }, [fetchProducts, fetchSales]);

  // Carga inicial - solo una vez
  useEffect(() => {
    mountedRef.current = true;

    if (!initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      refreshAll();
    }

    return () => {
      mountedRef.current = false;
    };
  }, []); // Sin dependencias para ejecutar solo una vez

  return {
    products,
    setProducts,
    sales,
    setSales,
    refreshAll,
    fetchProducts,
    fetchSales,
  };
}
