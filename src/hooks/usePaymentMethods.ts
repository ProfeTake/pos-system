import { useMemo } from "react";
import type { PaymentMethod } from "../types";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    cash: "Efectivo",
    debit: "Débito",
    credit: "Crédito",
    transfer: "Transferencia",
    efectivo: "Efectivo",
    tarjeta: "Tarjeta",
    transferencia: "Transferencia",
};

export function usePaymentMethods() {
    const formatPaymentMethod = useMemo(
        () => (method: PaymentMethod | string): string => {
            if (method in PAYMENT_METHOD_LABELS) {
                return PAYMENT_METHOD_LABELS[method as PaymentMethod];
            }
            return String(method);
        },
        []
    );

    const isValidPaymentMethod = useMemo(
        () =>
            (value: string): value is PaymentMethod => {
                return value in PAYMENT_METHOD_LABELS;
            },
        []
    );

    const paymentMethods = useMemo(
        () =>
            Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
                value: value as PaymentMethod,
                label,
            })),
        []
    );

    return {
        formatPaymentMethod,
        isValidPaymentMethod,
        paymentMethods,
        PAYMENT_METHOD_LABELS,
    };
}
