import { useCallback } from "react";
import {
  printSaleReceipt,
  getReceiptHtml,
  getShiftSummaryHtml,
  printShiftSummary,
  getCashMovementsSummaryHtml,
  printCashMovementsSummary,
  type ReceiptData,
  type ShiftSummaryData,
  type CashMovementsSummaryData,
} from "../components/common/ReceiptPrinter";
import { printReceiptViaElectron } from "../components/features/pos/electronPrint";
import { getPreferredPrinter } from "../components/features/pos/preferences";
import type { Sale, CashMovement } from "../types";

interface UseReceiptPrintingReturn {
  printReceipt: (data: ReceiptData, receiptType?: string) => Promise<boolean>;
  reprintSale: (sale: Sale) => Promise<boolean>;
  printShiftReport: (
    sales: Sale[],
    from: Date,
    to: Date,
    windowLabel?: string
  ) => Promise<boolean>;
  printCashSummary: (
    movements: CashMovement[],
    opening: number,
    closing: number,
    windowLabel?: string
  ) => Promise<boolean>;
}

/**
 * Custom hook for receipt printing operations
 * Handles both Electron native printing and browser fallback
 */
export function useReceiptPrinting(): UseReceiptPrintingReturn {
  /**
   * Print a receipt with Electron or fallback to browser
   */
  const printReceipt = useCallback(
    async (data: ReceiptData, receiptType?: string): Promise<boolean> => {
      try {
        const html = getReceiptHtml(data, receiptType);
        const preferredPrinter = getPreferredPrinter() || undefined;
        const printed = await printReceiptViaElectron(html, preferredPrinter);

        if (!printed) {
          // Fallback to browser print
          printSaleReceipt(data, receiptType);
          return false; // Indicates fallback was used
        }

        return true; // Successfully printed via Electron
      } catch (error) {
        console.error("Error printing receipt:", error);
        // Fallback to browser print
        printSaleReceipt(data, receiptType);
        return false;
      }
    },
    []
  );

  /**
   * Reprint an existing sale
   */
  const reprintSale = useCallback(
    async (sale: Sale): Promise<boolean> => {
      const itemsForPrint = sale.items.map((it) => ({
        name: it.productName,
        qty: it.quantity,
        unitPrice: it.price,
      }));

      const paymentMethodLabel = (() => {
        const m = sale.paymentMethod;
        switch (m) {
          case "cash":
            return "Efectivo";
          case "debit":
            return "Débito";
          case "credit":
            return "Crédito";
          case "transfer":
            return "Transferencia";
          default:
            return m || "N/D";
        }
      })();

      return printReceipt({
        storeName: "Punto tres",
        saleNumber: String(sale.id),
        date: typeof sale.date === "string" ? new Date(sale.date) : sale.date,
        paymentMethod: paymentMethodLabel,
        customerName: sale.customerName || "Cliente Anónimo",
        items: itemsForPrint,
        total: sale.total,
      });
    },
    [printReceipt]
  );

  /**
   * Print shift summary report
   */
  const printShiftReport = useCallback(
    async (
      sales: Sale[],
      from: Date,
      to: Date,
      windowLabel?: string
    ): Promise<boolean> => {
      try {
        // Build shift summary data
        const byMethod = {
          cash: 0,
          debit: 0,
          credit: 0,
          transfer: 0,
        };

        sales.forEach((sale) => {
          const method = sale.paymentMethod || "cash";
          if (method in byMethod) {
            byMethod[method as keyof typeof byMethod] += sale.total;
          }
        });

        const summaryData: ShiftSummaryData = {
          storeName: "Punto tres",
          generatedAt: new Date(),
          windowLabel:
            windowLabel ||
            `${from.toLocaleDateString("es-CL")} - ${to.toLocaleDateString(
              "es-CL"
            )}`,
          totalSales: sales.length,
          grandTotal: sales.reduce((sum, s) => sum + s.total, 0),
          byMethod,
        };

        const html = getShiftSummaryHtml(summaryData);
        const preferredPrinter = getPreferredPrinter() || undefined;
        const printed = await printReceiptViaElectron(html, preferredPrinter);

        if (!printed) {
          // Fallback to browser print
          printShiftSummary(summaryData);
          return false;
        }

        return true;
      } catch (error) {
        console.error("Error printing shift report:", error);
        return false;
      }
    },
    []
  );

  /**
   * Print cash movements summary
   */
  const printCashSummary = useCallback(
    async (
      movements: CashMovement[],
      opening: number,
      closing: number,
      windowLabel?: string
    ): Promise<boolean> => {
      try {
        // Calculate inflow/outflow
        let inflow = 0;
        let outflow = 0;
        const byMethod: Record<string, { inflow: number; outflow: number }> =
          {};

        const formattedMovements = movements.map((m) => {
          const amount = Number(m.amount || 0);
          const method = m.paymentMethod || "-";

          if (amount > 0) {
            inflow += amount;
            if (!byMethod[method]) byMethod[method] = { inflow: 0, outflow: 0 };
            byMethod[method].inflow += amount;
          } else if (amount < 0) {
            outflow += Math.abs(amount);
            if (!byMethod[method]) byMethod[method] = { inflow: 0, outflow: 0 };
            byMethod[method].outflow += Math.abs(amount);
          }

          // Format movement for display
          const typeLabel = (() => {
            switch (m.type) {
              case "deposit":
                return "Depósito";
              case "withdrawal":
                return "Retiro";
              case "adjustment":
                return "Ajuste";
              case "sale":
                return "Venta";
              default:
                return m.type || "-";
            }
          })();

          const methodLabel = (() => {
            switch (method) {
              case "cash":
                return "Efectivo";
              case "debit":
                return "Débito";
              case "credit":
                return "Crédito";
              case "transfer":
                return "Transferencia";
              default:
                return method;
            }
          })();

          return {
            date: m.date
              ? new Date(m.date).toLocaleString("es-CL", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-",
            type: typeLabel,
            method: methodLabel,
            description: m.description || "-",
            amount,
          };
        });

        const summaryData: CashMovementsSummaryData = {
          storeName: "Punto tres",
          generatedAt: new Date(),
          windowLabel: windowLabel || "Resumen de Caja",
          openingAmount: opening,
          inflow,
          outflow,
          net: inflow - outflow,
          closingBalance: closing,
          byMethod,
          movements: formattedMovements,
        };

        const html = getCashMovementsSummaryHtml(summaryData);
        const preferredPrinter = getPreferredPrinter() || undefined;
        const printed = await printReceiptViaElectron(html, preferredPrinter);

        if (!printed) {
          // Fallback to browser print
          printCashMovementsSummary(summaryData);
          return false;
        }

        return true;
      } catch (error) {
        console.error("Error printing cash summary:", error);
        return false;
      }
    },
    []
  );

  return {
    printReceipt,
    reprintSale,
    printShiftReport,
    printCashSummary,
  };
}
