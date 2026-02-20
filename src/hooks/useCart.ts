import { useState, useRef } from "react";
import { CartItem, Product } from "../types";
import { toast } from "sonner";

/**
 * Hook for managing the shopping cart state and operations.
 * Handles adding, removing, updating quantities, and calculating totals.
 *
 * @returns Object containing cart state and manipulation functions
 */
export function useCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [lastAddedName, setLastAddedName] = useState<string | null>(null);
  const [lastAddedAt, setLastAddedAt] = useState<number | null>(null);
  const clearTimerRef = useRef<number | null>(null);

  /**
   * Adds a product to the cart or updates its quantity if already exists.
   * Validates stock availability and product status.
   *
   * @param product - The product to add
   * @param quantity - Quantity to add (default: 1)
   * @returns Object with success status and optional error message
   */
  const addToCart = (product: Product, quantity: number = 1) => {
    if (product.estado === "DESHABILITADO") {
      // Producto deshabilitado, no se puede agregar
      return { success: false, error: "Producto deshabilitado" };
    }

    let success = false;
    let error: string | null = null;

    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.product.id === product.id);
      const currentCartQuantity = existingItem ? existingItem.quantity : 0;
      const newTotalQuantity = currentCartQuantity + quantity;

      // Validar que no exceda el stock disponible
      if (newTotalQuantity > product.stock) {
        const remaining = product.stock - currentCartQuantity;
        if (remaining <= 0) {
          error = `No hay más stock disponible de ${product.name}`;
        } else {
          error = `Solo quedan ${remaining} unidades disponibles de ${product.name}`;
        }
        return prev;
      }

      success = true;
      // Marcar producto agregado para indicador visual en sidebar
      try {
        setLastAddedName(product.name);
        const now = Date.now();
        setLastAddedAt(now);
        if (clearTimerRef.current) {
          window.clearTimeout(clearTimerRef.current);
        }
        clearTimerRef.current = window.setTimeout(() => {
          setLastAddedName(null);
          setLastAddedAt(null);
        }, 4000); // indicador visible por 4s
      } catch {}

      if (existingItem) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });

    return { success, error };
  };

  /**
   * Removes a product completely from the cart.
   * @param productId - ID of the product to remove
   */
  const removeFromCart = (productId: number | string) => {
    const idNum = Number(productId);
    setCartItems((prev) => prev.filter((item) => item.product.id !== idNum));
  };

  /**
   * Updates the quantity of a specific product in the cart.
   * If quantity is <= 0, removes the item.
   * Validates against available stock.
   *
   * @param productId - ID of the product to update
   * @param quantity - New quantity
   */
  const updateQuantity = (productId: number | string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const idNum = Number(productId);
    setCartItems((prev) => {
      const item = prev.find((i) => i.product.id === idNum);
      if (!item) {
        toast.error("Producto no encontrado en el carrito");
        return prev;
      }

      // Validar que no exceda el stock disponible
      if (quantity > item.product.stock) {
        toast.error(
          `Stock insuficiente. Solo quedan ${item.product.stock} unidades disponibles`
        );
        return prev;
      }

      return prev.map((i) => (i.product.id === idNum ? { ...i, quantity } : i));
    });
  };

  /**
   * Removes all items from the cart.
   */
  const clearCart = () => {
    setCartItems([]);
  };

  /**
   * Calculates the total price of all items in the cart.
   * @returns Total price
   */
  const getTotalPrice = () => {
    return cartItems.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  };

  /**
   * Calculates the total number of items in the cart.
   * @returns Total item count
   */
  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getLastAdded = () => lastAddedName;
  const isRecentlyAdded = () => {
    return lastAddedAt != null && Date.now() - lastAddedAt < 4000;
  };

  return {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
    getLastAdded,
    isRecentlyAdded,
  };
}
