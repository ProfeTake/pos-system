import { Card, CardContent, CardFooter } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import { ShoppingCart, AlertTriangle, Slash } from "lucide-react";
import { Product } from "../../../types";
import { useState, memo } from "react";

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
  showStock?: boolean;
}

/**
 * ProductCard component optimized with React.memo
 * Only re-renders when product data changes (id, stock, price, estado)
 */
export const ProductCard = memo(function ProductCard({
  product,
  onAddToCart,
  showStock = true,
}: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const isLowStock = product.stock <= product.minStock;
  const isOutOfStock = product.stock === 0;
  const isDisabled = product.estado === "DESHABILITADO";

  const handleAddToCart = () => {
    if (quantity > 0 && quantity <= product.stock) {
      onAddToCart(product, quantity);
      setQuantity(1);
    }
  };

  return (
    <Card className="flex h-full min-h-[360px] flex-col">
      <CardContent className="flex flex-1 flex-col justify-between gap-4 p-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium text-lg leading-tight">
              {product.name}
            </h3>
            {isDisabled && (
              <Badge variant="secondary" className="text-xs">
                <Slash className="size-3 mr-1" />
                Deshabilitado
              </Badge>
            )}
            {!isDisabled && isLowStock && !isOutOfStock && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="size-3 mr-1" />
                Bajo
              </Badge>
            )}
            {!isDisabled && isOutOfStock && (
              <Badge variant="outline" className="text-xs">
                Agotado
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {product.category}
            </Badge>
            {product.alcoholContent && (
              <span className="text-sm text-muted-foreground">
                {product.alcoholContent}% vol.
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground font-medium">
            {product.volume}ml
          </p>
        </div>

        <div className="space-y-2">
          {showStock && !isDisabled && (
            <p className="text-sm">
              Stock:{" "}
              <span
                className={`font-medium ${isLowStock ? "text-destructive" : ""
                  }`}
              >
                {product.stock} unidades
              </span>
            </p>
          )}
          {showStock && isDisabled && (
            <p className="text-sm text-muted-foreground">
              Producto deshabilitado
            </p>
          )}

          <div className="text-xl font-bold">
            ${product.price.toLocaleString("es-CL")}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0">
        <div className="flex w-full gap-3">
          <Input
            type="number"
            min="1"
            max={product.stock}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, parseInt(e.target.value) || 1))
            }
            className="w-24 h-10"
            disabled={isOutOfStock || isDisabled}
          />
          <Button
            onClick={handleAddToCart}
            disabled={isDisabled || isOutOfStock || quantity > product.stock}
            className="flex-1 h-10"
          >
            <ShoppingCart className="size-4 mr-2" />
            {isDisabled ? "Bloqueado" : "Agregar"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if these specific properties change
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.stock === nextProps.product.stock &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.estado === nextProps.product.estado &&
    prevProps.showStock === nextProps.showStock
  );
});
