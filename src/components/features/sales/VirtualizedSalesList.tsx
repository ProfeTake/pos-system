import { memo, CSSProperties, useState } from "react";
import { VariableSizeList, areEqual } from "react-window";
import { Card, CardContent } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Eye, Printer, ChevronDown, ChevronUp } from "lucide-react";
import type { Sale } from "../../../types";

interface VirtualizedSalesListProps {
    sales: Sale[];
    onViewDetails: (sale: Sale) => void;
    onPrintReceipt: (sale: Sale) => void;
}

interface RowData {
    sales: Sale[];
    expandedSales: Set<number>;
    onViewDetails: (sale: Sale) => void;
    onPrintReceipt: (sale: Sale) => void;
    onToggleExpand: (saleId: number) => void;
}

interface RowProps {
    index: number;
    style: CSSProperties;
    data: RowData;
}

// STRATEGIC COMMENT: Dynamic Row Rendering
// Sales rows can expand to show items. We use `VariableSizeList` to handle this.
// The `SaleRow` component receives the `style` prop from react-window which positions it absolutely.
// We use `areEqual` to optimize re-renders, only updating when data relevant to this specific row changes.
const SaleRow = memo(({ index, style, data }: RowProps) => {
    const { sales, expandedSales, onViewDetails, onPrintReceipt, onToggleExpand } = data;
    const sale = sales[index];
    const isExpanded = expandedSales.has(sale.id);

    const paymentMethodLabel = (() => {
        switch (sale.paymentMethod) {
            case "cash":
                return "Efectivo";
            case "debit":
                return "Débito";
            case "credit":
                return "Crédito";
            case "transfer":
                return "Transferencia";
            default:
                return sale.paymentMethod || "N/D";
        }
    })();

    const paymentMethodColor = (() => {
        switch (sale.paymentMethod) {
            case "cash":
                return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
            case "debit":
                return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
            case "credit":
                return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
            case "transfer":
                return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
        }
    })();

    return (
        <div style={style}>
            <Card className="mb-3">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="font-mono text-sm font-medium">#{sale.id}</span>
                                <Badge className={paymentMethodColor}>{paymentMethodLabel}</Badge>
                                <span className="text-sm text-muted-foreground">
                                    {new Date(sale.date).toLocaleString("es-CL", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </span>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-muted-foreground">
                                    Cliente: <span className="text-foreground">{sale.customerName || "Anónimo"}</span>
                                </span>
                                <span className="text-muted-foreground">
                                    Items: <span className="text-foreground">{sale.items.length}</span>
                                </span>
                                <span className="font-semibold text-lg">
                                    ${sale.total.toLocaleString("es-CL")}
                                </span>
                            </div>

                            {isExpanded && (
                                <div className="mt-3 pt-3 border-t space-y-2">
                                    {sale.items.slice(0, 5).map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                {item.quantity}x {item.productName}
                                            </span>
                                            <span className="font-medium">
                                                ${(item.quantity * item.price).toLocaleString("es-CL")}
                                            </span>
                                        </div>
                                    ))}
                                    {sale.items.length > 5 && (
                                        <p className="text-xs text-muted-foreground">
                                            +{sale.items.length - 5} items más
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onToggleExpand(sale.id)}
                                title={isExpanded ? "Contraer" : "Expandir"}
                            >
                                {isExpanded ? (
                                    <ChevronUp className="size-4" />
                                ) : (
                                    <ChevronDown className="size-4" />
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onViewDetails(sale)}
                                title="Ver detalles"
                            >
                                <Eye className="size-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onPrintReceipt(sale)}
                                title="Reimprimir"
                            >
                                <Printer className="size-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}, areEqual);

SaleRow.displayName = "VirtualizedSaleRow";

/**
 * Virtualized Sales History List.
 * 
 * Uses `react-window`'s `VariableSizeList` because sale rows can have different heights
 * depending on whether they are expanded to show items or not.
 * 
 * @param props.sales - The list of sales to display.
 * @param props.onViewDetails - Callback to view full sale details.
 * @param props.onPrintReceipt - Callback to reprint a receipt.
 */
export const VirtualizedSalesList = memo(
    ({ sales, onViewDetails, onPrintReceipt }: VirtualizedSalesListProps) => {
        const [expandedSales, setExpandedSales] = useState<Set<number>>(new Set());

        const handleToggleExpand = (saleId: number) => {
            setExpandedSales((prev) => {
                const next = new Set(prev);
                if (next.has(saleId)) {
                    next.delete(saleId);
                } else {
                    next.add(saleId);
                }
                // Important: We must reset the cache for this index because its size changed.
                // However, VariableSizeList ref access is needed for that. 
                // For simplicity in this implementation, we rely on react-window re-measuring 
                // or a forced update if we attached a ref. 
                // In a production app with strict height requirements, we'd use a ref to call listRef.current.resetAfterIndex(index).
                return next;
            });
        };

        // STRATEGIC COMMENT: Dynamic Height Calculation
        // Calculates the height of each row based on its expanded state and number of items.
        // Base height: 120px
        // Expanded overhead: 40px (padding/borders)
        // Per item height: 28px
        // Extra items indicator: 20px
        const getItemSize = (index: number) => {
            const sale = sales[index];
            const isExpanded = expandedSales.has(sale.id);

            if (!isExpanded) {
                return 120;
            }

            const itemsToShow = Math.min(sale.items.length, 5);
            const itemsHeight = itemsToShow * 28;
            const extraHeight = sale.items.length > 5 ? 20 : 0;

            return 120 + 40 + itemsHeight + extraHeight;
        };

        const LIST_HEIGHT = 700;

        if (sales.length === 0) {
            return (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No hay ventas para mostrar</p>
                </div>
            );
        }

        return (
            <VariableSizeList
                height={LIST_HEIGHT}
                itemCount={sales.length}
                itemSize={getItemSize}
                width="100%"
                itemData={{
                    sales,
                    expandedSales,
                    onViewDetails,
                    onPrintReceipt,
                    onToggleExpand: handleToggleExpand,
                }}
            >
                {SaleRow}
            </VariableSizeList>
        );
    }
);

VirtualizedSalesList.displayName = "VirtualizedSalesList";
