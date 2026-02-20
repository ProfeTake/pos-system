import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Separator } from "../../ui/separator";
import { CreditCard, Loader2, ShoppingBag } from "lucide-react";
import { usePaymentMethods } from "../../../hooks/usePaymentMethods";
import type { PaymentMethod, CartItem } from "../../../types";
import { ScrollArea } from "../../ui/scroll-area";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  itemCount: number;
  cartItems: CartItem[];
  miscItems: number[];
  onConfirm: (data: {
    customerName: string;
    paymentMethod: PaymentMethod;
    receiptType: "boleta" | "comprobante";
  }) => Promise<void>;
  submitting: boolean;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  totalAmount,
  itemCount,
  cartItems,
  miscItems,
  onConfirm,
  submitting,
}: CheckoutDialogProps) {
  const { paymentMethods } = usePaymentMethods();
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [receiptType, setReceiptType] = useState<"boleta" | "comprobante">(
    "boleta"
  );

  const handleConfirm = async () => {
    await onConfirm({ customerName, paymentMethod, receiptType });
    // Reset form
    setCustomerName("");
    setPaymentMethod("cash");
    setReceiptType("boleta");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CreditCard className="h-6 w-6" />
            Finalizar Venta
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-2">
          {/* Resumen de Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Resumen de productos
              </h3>
              <span className="text-xs text-muted-foreground">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </div>

            <div className="rounded-md border bg-muted/30">
              <ScrollArea className="h-[120px] w-full p-3">
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.product.id} className="flex justify-between text-sm">
                      <div className="flex gap-2">
                        <span className="font-medium w-6 text-right">{item.quantity}x</span>
                        <span className="text-muted-foreground truncate max-w-[200px]">
                          {item.product.name}
                        </span>
                      </div>
                      <span>${(item.product.price * item.quantity).toLocaleString("es-CL")}</span>
                    </div>
                  ))}
                  {miscItems.map((amount, idx) => (
                    <div key={`misc-${idx}`} className="flex justify-between text-sm">
                      <div className="flex gap-2">
                        <span className="font-medium w-6 text-right">1x</span>
                        <span className="text-muted-foreground">Venta variada</span>
                      </div>
                      <span>${amount.toLocaleString("es-CL")}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-semibold text-lg">Total a Pagar</span>
              <span className="font-bold text-2xl text-primary">
                ${totalAmount.toLocaleString("es-CL")}
              </span>
            </div>
          </div>

          <Separator />

          {/* Formulario de Pago */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="customer-name" className="mb-1.5 block">Cliente (Opcional)</Label>
              <Input
                id="customer-name"
                placeholder="Nombre del cliente..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={submitting}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payment-method">Método de Pago</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) =>
                  setPaymentMethod(value as PaymentMethod)
                }
                disabled={submitting}
              >
                <SelectTrigger id="payment-method" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="receipt-type">Tipo de Documento</Label>
              <Select
                value={receiptType}
                onValueChange={(value) =>
                  setReceiptType(value as "boleta" | "comprobante")
                }
                disabled={submitting}
              >
                <SelectTrigger id="receipt-type" className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleta">Boleta Electrónica</SelectItem>
                  <SelectItem value="comprobante">Comprobante Interno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="h-11"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
            className="h-11 px-8 text-base"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>Confirmar Venta</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
