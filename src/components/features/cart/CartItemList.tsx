import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Card, CardContent } from "../../ui/card";
import { Trash2, Plus, Minus } from "lucide-react";
import type { CartItem as CartItemType } from "../../../types";
import { memo } from "react";

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (productId: number | string, quantity: number) => void;
  onRemoveItem: (productId: number | string) => void;
}

/**
 * Individual cart item component optimized with React.memo
 * Only re-renders when item quantity or product changes
 */
const CartItem = memo(
  ({ item, onUpdateQuantity, onRemoveItem }: CartItemProps) => {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <h3 className="font-medium">{item.product.name}</h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{item.product.category}</Badge>
                {item.product.stock <= item.product.minStock && (
                  <Badge variant="destructive" className="text-xs">
                    Stock Bajo
                  </Badge>
                )}
                {item.quantity >= item.product.stock && (
                  <Badge variant="secondary" className="text-xs">
                    Stock Máximo
                  </Badge>
                )}
              </div>
              <p className="font-medium">
                ${item.product.price.toLocaleString("es-CL")} c/u
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveItem(item.product.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    onUpdateQuantity(
                      item.product.id,
                      Math.max(1, item.quantity - 1)
                    )
                  }
                  disabled={item.quantity <= 1}
                  className="h-9 w-9"
                >
                  <Minus className="size-4" />
                </Button>

                <Input
                  type="number"
                  min="1"
                  max={item.product.stock}
                  value={item.quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    const clamped = Math.min(
                      Math.max(1, val),
                      item.product.stock
                    );
                    onUpdateQuantity(item.product.id, clamped);
                  }}
                  className="w-20 text-center h-9"
                />

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    onUpdateQuantity(
                      item.product.id,
                      Math.min(item.product.stock, item.quantity + 1)
                    )
                  }
                  disabled={item.quantity >= item.product.stock}
                  className="h-9 w-9"
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <div className="text-right">
                <p className="font-medium text-lg">
                  $
                  {(item.product.price * item.quantity).toLocaleString("es-CL")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {item.quantity} × $
                  {item.product.price.toLocaleString("es-CL")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if quantity or product id changes
    return (
      prevProps.item.product.id === nextProps.item.product.id &&
      prevProps.item.quantity === nextProps.item.quantity &&
      prevProps.item.product.stock === nextProps.item.product.stock
    );
  }
);

CartItem.displayName = "CartItem";

interface CartItemListProps {
  items: CartItemType[];
  onUpdateQuantity: (productId: number | string, quantity: number) => void;
  onRemoveItem: (productId: number | string) => void;
}

export function CartItemList({
  items,
  onUpdateQuantity,
  onRemoveItem,
}: CartItemListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <CartItem
          key={item.product.id}
          item={item}
          onUpdateQuantity={onUpdateQuantity}
          onRemoveItem={onRemoveItem}
        />
      ))}
    </div>
  );
}
