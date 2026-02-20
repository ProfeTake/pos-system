import { useState, useMemo, useEffect, useRef } from "react";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Search, Filter, X } from "lucide-react";
import { Product, Promotion } from "../../../types";
import { ProductCard } from "./ProductCard";
import { PromotionCard } from "./PromotionCard";
import { promotionsService } from "../../../services/promotions.service";
import { toast } from "sonner";

interface ProductCatalogProps {
  products: Product[];
  onAddToCart: (product: Product, quantity: number) => void;
}

export function ProductCatalog({ products, onAddToCart }: ProductCatalogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  // Paginación (solo cuando NO hay filtros activos)
  const PAGE_SIZE = 16;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Al montar (entrar al Catálogo), enfocar y seleccionar el input de búsqueda
  useEffect(() => {
    if (searchRef.current) {
      searchRef.current.focus();
      searchRef.current.select();
    }
    // Fetch active promotions
    promotionsService.getActive()
      .then(setPromotions)
      .catch((err) => {
        console.error("Error fetching promotions:", err);
      });
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map((p) => p.category))];
    return cats.sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Ocultar productos deshabilitados del catálogo
      if (product.estado === "DESHABILITADO") return false;
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barCode?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || product.category === selectedCategory;

      const matchesPrice = (() => {
        switch (priceRange) {
          case "low":
            return product.price <= 5000;
          case "medium":
            return product.price > 5000 && product.price <= 20000;
          case "high":
            return product.price > 20000;
          default:
            return true;
        }
      })();

      const matchesStock = (() => {
        switch (stockFilter) {
          case "available":
            return product.stock > 0;
          case "low":
            return product.stock <= product.minStock && product.stock > 0;
          case "out":
            return product.stock === 0;
          default:
            return true;
        }
      })();

      return matchesSearch && matchesCategory && matchesPrice && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, priceRange, stockFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setPriceRange("all");
    setStockFilter("all");
    setCurrentPage(1);
  };

  const hasActiveFilters =
    !!searchTerm ||
    selectedCategory !== "all" ||
    priceRange !== "all" ||
    stockFilter !== "all";

  // Reset page cuando se activan filtros o cambian
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, priceRange, stockFilter]);

  const totalPages = useMemo(() => {
    if (hasActiveFilters) return 1;
    const activeProducts = filteredProducts.length;
    return Math.max(1, Math.ceil(activeProducts / PAGE_SIZE));
  }, [filteredProducts.length, hasActiveFilters]);

  const paginatedProducts = useMemo(() => {
    if (hasActiveFilters) return filteredProducts;
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage, hasActiveFilters]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  };
  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  // Botones de página (si muchas páginas, mostrar ventana compacta)
  const pageButtons = useMemo(() => {
    if (totalPages <= 1) return [] as number[];
    const maxButtons = 7;
    if (totalPages <= maxButtons)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: number[] = [];
    // Centro alrededor de currentPage
    const windowSize = 5; // páginas visibles en el centro
    let start = Math.max(1, currentPage - Math.floor(windowSize / 2));
    let end = start + windowSize - 1;
    if (end > totalPages) {
      end = totalPages;
      start = end - windowSize + 1;
    }
    // Asegurar rango
    for (let p = start; p <= end; p++) pages.push(p);
    if (!pages.includes(1)) pages.unshift(1);
    if (!pages.includes(totalPages)) pages.push(totalPages);
    return pages;
  }, [totalPages, currentPage]);

  const renderPagination = (variant: "inline" | "block" = "block") => {
    if (hasActiveFilters || filteredProducts.length === 0 || totalPages <= 1)
      return null;

    const containerClass =
      variant === "inline"
        ? "flex items-center justify-end gap-2 flex-wrap"
        : "flex items-center justify-center gap-2 flex-wrap py-2";

    return (
      <div className={containerClass}>
        <Button
          variant="outline"
          size="sm"
          onClick={prevPage}
          disabled={currentPage === 1}
          aria-label="Página anterior"
        >
          Anterior
        </Button>
        {pageButtons.map((p, idx) => {
          const isEllipsisBefore = idx > 0 && p - pageButtons[idx - 1] > 1;
          return (
            <span key={p} className="flex items-center">
              {isEllipsisBefore && (
                <span className="px-1 text-muted-foreground select-none">
                  …
                </span>
              )}
              <Button
                variant={p === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => goToPage(p)}
                aria-current={p === currentPage ? "page" : undefined}
                aria-label={`Ir a página ${p}`}
              >
                {p}
              </Button>
            </span>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          onClick={nextPage}
          disabled={currentPage === totalPages}
          aria-label="Página siguiente"
        >
          Siguiente
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1>Catálogo de Productos</h1>
        <p className="text-muted-foreground">
          Explora nuestro inventario completo
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="size-4" />
            Filtros
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-auto"
              >
                <X className="size-4 mr-1" />
                Limpiar
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label>Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  placeholder="Nombre del producto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {searchTerm && (
                  <button
                    type="button"
                    aria-label="Limpiar búsqueda"
                    onClick={() => {
                      setSearchTerm("");
                      searchRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label>Categoría</label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label>Precio</label>
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los precios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los precios</SelectItem>
                  <SelectItem value="low">Hasta $5.000</SelectItem>
                  <SelectItem value="medium">$5.001 - $20.000</SelectItem>
                  <SelectItem value="high">Más de $20.000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label>Stock</label>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todo el stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el stock</SelectItem>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="low">Stock bajo</SelectItem>
                  <SelectItem value="out">Agotado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {filteredProducts.length} de{" "}
            {products.filter((p) => p.estado !== "DESHABILITADO").length}{" "}
            productos
          </p>
          {renderPagination("inline")}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-stretch">
          {/* Show promotions first */}
          {promotions.map((promotion) => (
            <PromotionCard
              key={`promo-${promotion.id}`}
              promotion={promotion}
              products={products}
              onScanPromotion={(promo) => {
                toast.info(`Promoción: ${promo.name}. Escanea el código ${promo.barcode} en el POS para aplicarla.`);
              }}
            />
          ))}
          {/* Then show products */}
          {paginatedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No se encontraron productos que coincidan con los filtros
              seleccionados.
            </p>
          </div>
        )}

        {/* Paginación inferior */}
        {renderPagination()}
      </div>
    </div>
  );
}
