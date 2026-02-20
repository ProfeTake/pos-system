import { memo, CSSProperties } from "react";
import { FixedSizeList, areEqual } from "react-window";
import { TableRow, TableCell } from "../../ui/table";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Pencil } from "lucide-react";
import type { Product } from "../../../types";

interface VirtualizedInventoryTableProps {
    products: Product[];
    onEdit: (product: Product) => void;
    getStockStatus: (product: Product) => {
        label: string;
        variant: "destructive" | "secondary";
    };
}

interface RowProps {
    index: number;
    style: CSSProperties;
    data: {
        products: Product[];
        onEdit: (product: Product) => void;
        getStockStatus: (product: Product) => {
            label: string;
            variant: "destructive" | "secondary";
        };
    };
}

// STRATEGIC COMMENT: Row Memoization
// We wrap the Row component in React.memo (via areEqual from react-window) to prevent unnecessary re-renders
// of off-screen or unchanged rows when scrolling or when other rows update.
const Row = memo(({ index, style, data }: RowProps) => {
    const { products, onEdit, getStockStatus } = data;
    const product = products[index];
    const status = getStockStatus(product);
    const totalValue = product.stock * product.price;

    return (
        <div style={style}>
            <TableRow
                className={`${product.estado === "BAJO" || product.estado === "AGOTADO"
                    ? "bg-destructive/5"
                    : ""
                    } ${product.estado === "DESHABILITADO" ? "opacity-50" : ""}`}
            >
                <TableCell>
                    <div>
                        <div
                            className={`font-medium ${product.estado === "DESHABILITADO" ? "line-through" : ""
                                }`}
                        >
                            {product.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {product.ml}
                            {product.measureUnit && product.measureUnit !== "none"
                                ? product.measureUnit
                                : "ml"}
                            {product.barCode && ` • Código: ${product.barCode}`}
                            {product.alcoholContent && ` • ${product.alcoholContent}% vol.`}
                        </div>
                    </div>
                </TableCell>
                <TableCell>
                    <Badge variant="secondary" className="text-xs">
                        {product.category}
                    </Badge>
                </TableCell>
                <TableCell className="text-center">{product.stock}</TableCell>
                <TableCell className="text-center">{product.minStock}</TableCell>
                <TableCell className="text-center">
                    <Badge variant={status.variant} className="text-xs">
                        {status.label}
                    </Badge>
                </TableCell>
                <TableCell className="text-right">
                    ${product.price.toLocaleString("es-CL")}
                </TableCell>
                <TableCell className="text-right">
                    ${totalValue.toLocaleString("es-CL")}
                </TableCell>
                <TableCell className="text-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(product)}
                        disabled={product.estado === "DESHABILITADO"}
                    >
                        <Pencil className="size-4" />
                    </Button>
                </TableCell>
            </TableRow>
        </div>
    );
}, areEqual);

Row.displayName = "VirtualizedInventoryRow";

/**
 * Virtualized Inventory Table.
 * 
 * Uses `react-window`'s `FixedSizeList` to efficiently render large lists of products.
 * Only the visible rows (plus a small overscan buffer) are rendered in the DOM,
 * significantly improving performance for inventories with thousands of items.
 * 
 * @param props.products - The list of products to display.
 * @param props.onEdit - Callback when the edit button is clicked.
 * @param props.getStockStatus - Helper to determine the status badge variant.
 */
export const VirtualizedInventoryTable = memo(
    ({ products, onEdit, getStockStatus }: VirtualizedInventoryTableProps) => {
        const ROW_HEIGHT = 80;
        const TABLE_HEIGHT = 600;

        return (
            <FixedSizeList
                height={TABLE_HEIGHT}
                itemCount={products.length}
                itemSize={ROW_HEIGHT}
                width="100%"
                itemData={{
                    products,
                    onEdit,
                    getStockStatus,
                }}
            >
                {Row}
            </FixedSizeList>
        );
    }
);

VirtualizedInventoryTable.displayName = "VirtualizedInventoryTable";
