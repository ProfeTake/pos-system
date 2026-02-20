import { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../ui/card";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import { Badge } from "../../ui/badge";
import { Alert, AlertDescription } from "../../ui/alert";
import {
  ShoppingCart as CartIcon,
  Trash2,
  Calculator,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import { CartItem, Sale, PaymentMethod } from "../../../types";
import { useCashStatus } from "../../../hooks/CashStatusContext";
import { useReceiptPrinting } from "../../../hooks/useReceiptPrinting";
import { toast } from "sonner";
import { apiFetchJSON } from "../../../lib/api";
import { saleSchema, safeParse } from "../../../lib/schemas";
import { CartItemList } from "./CartItemList";
import { MiscSalesDialog } from "./MiscSalesDialog";
import { CheckoutDialog } from "./CheckoutDialog";

interface ShoppingCartProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: number | string, quantity: number) => void;
  onRemoveItem: (productId: number | string) => void;
  onClearCart: () => void;
  onCompleteSale: (sale: Sale) => void;
}

export function ShoppingCart({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCompleteSale,
}: ShoppingCartProps) {
  const { mustOpen } = useCashStatus();
  const { printReceipt } = useReceiptPrinting();
  const cashClosed = mustOpen;

  // Filter out disabled products
  const visibleItems = cartItems.filter(
    (ci) => ci.product.estado !== "DESHABILITADO"
  );

  // Dialog states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isMiscOpen, setIsMiscOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Miscellaneous sales items
  const [miscItems, setMiscItems] = useState<number[]>([]);

  // Calculate totals
  const totalPrice = visibleItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const totalItemsProducts = visibleItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const miscTotal = miscItems.reduce((s, n) => s + (Number(n) || 0), 0);
  const totalMiscItems = miscItems.length;
  const totalCombined = totalPrice + miscTotal;
  const totalItemsCombined = totalItemsProducts + totalMiscItems;

  /**
   * Handle checkout confirmation
   */
  const handleCheckout = async (data: {
    customerName: string;
    paymentMethod: PaymentMethod;
    receiptType: "boleta" | "comprobante";
  }) => {
    setSubmitting(true);

    try {
      let salePosted = false;
      let miscPosted = false;
      let saleId: string | null = null;
      let miscId: string | null = null;

      // 1) Register product sale if there are items
      if (visibleItems.length > 0) {
        try {
          const payload = {
            items: visibleItems.map((ci) => ({
              id: ci.product.id,
              name: ci.product.name,
              price: ci.product.price,
              quantity: ci.quantity,
            })),
            total: totalPrice,
            paymentMethod: data.paymentMethod,
            customerName: data.customerName || undefined,
          };

          const result = await apiFetchJSON<any>("/api/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          // The API returns the full sale object with id, date, etc.
          if (!result || !result.id) {
            toast.error("Respuesta inválida del servidor");
            throw new Error("Invalid sale response");
          }

          saleId = result.id;
          salePosted = true;
          onCompleteSale(result);
        } catch (err: any) {
          toast.error(err.message || "Error registrando venta");
          throw err;
        }
      }

      // 2) Register miscellaneous sale if there are misc items
      if (miscItems.length > 0) {
        try {
          // Crear una venta en el sistema para el historial
          // Usar productId=0 como indicador especial (será manejado por el backend)
          const miscSalePayload = {
            items: miscItems.map((amt, idx) => ({
              id: 0, // ID especial para items variados (el backend lo manejará)
              name: miscItems.length > 1 ? `Venta variada #${idx + 1}` : "Venta variada",
              price: amt,
              quantity: 1,
            })),
            total: miscTotal,
            paymentMethod: data.paymentMethod,
            customerName: data.customerName || undefined,
          };

          const miscSaleResult = await apiFetchJSON<any>("/api/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(miscSalePayload),
          });

          if (miscSaleResult?.id) {
            miscId = miscSaleResult.id;
            miscPosted = true;
            
            // También registrar movimiento de caja para rastreo
            await apiFetchJSON<any>("/api/cash-session/movement", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "sale",
                amount: miscTotal,
                description: `Venta variada (${miscItems.length} item${
                  miscItems.length > 1 ? "s" : ""
                })`,
                paymentMethod: data.paymentMethod,
                referenceId: miscSaleResult.id,
              }),
            });
          }
        } catch (err: any) {
          toast.error(err.message || "Error registrando venta variada");
          throw err;
        }
      }

      // 3) Print receipt
      const itemsForPrint: Array<{
        name: string;
        qty: number;
        unitPrice: number;
      }> = [];

      if (salePosted) {
        for (const it of visibleItems) {
          itemsForPrint.push({
            name: it.product.name,
            qty: it.quantity,
            unitPrice: it.product.price,
          });
        }
      }

      if (miscPosted) {
        miscItems.forEach((amt, idx) => {
          itemsForPrint.push({
            name:
              miscItems.length > 1
                ? `Venta variada #${idx + 1}`
                : "Venta variada",
            qty: 1,
            unitPrice: amt,
          });
        });
      }

      const saleNumber = saleId || miscId || `TX-${Date.now()}`;
      const printTotal = itemsForPrint.reduce(
        (acc, l) => acc + l.qty * l.unitPrice,
        0
      );

      // Preparar datos para impresión
      const receiptTypeLabel =
        data.receiptType === "boleta" ? "Boleta" : "Comprobante de Venta";

      const receiptData = {
        storeName: "Punto tres",
        saleNumber,
        date: new Date(),
        paymentMethod: formatPaymentMethod(data.paymentMethod),
        customerName: data.customerName || "Cliente Anónimo",
        items: itemsForPrint,
        total: printTotal,
      };

      // 4) Clear cart and misc items PRIMERO
      onClearCart();
      setMiscItems([]);
      
      // Cerrar diálogo ANTES de imprimir para evitar conflicto con overlay
      setIsCheckoutOpen(false);
      
      // Mostrar toast de éxito
      toast.success(`Venta completada: $${printTotal.toLocaleString("es-CL")}`);

      // Esperar que el diálogo se cierre completamente (animación ~200ms)
      // antes de abrir el diálogo de impresión del navegador
      setTimeout(() => {
        printReceipt(receiptData, receiptTypeLabel).catch(() => {
          console.warn("Error al imprimir, pero la venta se completó");
        });
      }, 300);

    } catch (error) {
      console.error("Error completing sale:", error);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Format payment method label
   */
  const formatPaymentMethod = (method: PaymentMethod): string => {
    const labels: Record<PaymentMethod, string> = {
      cash: "Efectivo",
      debit: "Débito",
      credit: "Crédito",
      transfer: "Transferencia",
      efectivo: "",
      tarjeta: "",
      transferencia: "",
    };
    return labels[method] || String(method);
  };

  /**
   * Handle misc sales confirmation
   */
  const handleMiscConfirm = (items: number[]) => {
    setMiscItems(items);
    toast.success(`${items.length} item(s) variado(s) agregado(s) al carrito`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Carrito de Compras
          </h1>
          <p className="text-muted-foreground">
            {totalItemsCombined} producto{totalItemsCombined !== 1 ? "s" : ""}{" "}
            en el carrito
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            onClearCart();
            setMiscItems([]);
          }}
          disabled={totalItemsCombined === 0}
        >
          <Trash2 className="size-4 mr-2" />
          Vaciar Carrito
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lista de productos */}
        <div className="lg:col-span-2 space-y-4">
          {visibleItems.length === 0 && miscItems.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CartIcon className="size-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Agrega productos desde el catálogo o usa "Agregar venta
                  variada" para registrar un monto.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <CartItemList
                items={visibleItems}
                onUpdateQuantity={onUpdateQuantity}
                onRemoveItem={onRemoveItem}
              />

              {/* Ítems de venta variada en la lista del carrito */}
              {miscItems.map((amt, idx) => (
                <Card key={`misc-card-${idx}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <h3 className="font-medium">
                          {miscItems.length > 1
                            ? `Venta variada #${idx + 1}`
                            : "Venta variada"}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Varios</Badge>
                        </div>
                        <p className="font-medium">
                          ${amt.toLocaleString("es-CL")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setMiscItems((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        <div className="h-9" />
                        <div className="text-right">
                          <p className="font-medium text-lg">
                            ${amt.toLocaleString("es-CL")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>

        {/* Resumen del pedido */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Productos:</span>
                  <span>${totalPrice.toLocaleString("es-CL")}</span>
                </div>
                {/* Botón para abrir modal de venta variada */}
                <div className="flex items-center justify-between">
                  {miscTotal > 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Venta variada:{" "}
                      <span className="font-medium">
                        ${miscTotal.toLocaleString("es-CL")}
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Sin venta variada
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsMiscOpen(true)}
                  >
                    <Calculator className="size-4 mr-2" />
                    Venta variada
                  </Button>
                </div>
                {/* Listado de ventas variadas debajo del botón */}
                {miscItems.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {miscItems.map((amt, idx) => (
                      <div
                        key={`misc-line-${idx}`}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          #{idx + 1}
                        </span>
                        <span>${amt.toLocaleString("es-CL")}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total:</span>
                <span>${totalCombined.toLocaleString("es-CL")}</span>
              </div>
              {cashClosed && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="size-4" />
                  <AlertDescription>
                    Caja cerrada. Debe abrirse para operar.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                onClick={() => setIsCheckoutOpen(true)}
                disabled={
                  cashClosed || (visibleItems.length === 0 && miscTotal <= 0)
                }
              >
                <CreditCard className="size-4 mr-2" />
                Proceder al Pago
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <MiscSalesDialog
        open={isMiscOpen}
        onOpenChange={setIsMiscOpen}
        onConfirm={handleMiscConfirm}
        existingItems={miscItems}
        onRemoveExisting={(idx) =>
          setMiscItems((arr) => arr.filter((_, i) => i !== idx))
        }
      />

      <CheckoutDialog
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        totalAmount={totalCombined}
        itemCount={totalItemsCombined}
        cartItems={visibleItems}
        miscItems={miscItems}
        onConfirm={handleCheckout}
        submitting={submitting}
      />
    </div>
  );
}
