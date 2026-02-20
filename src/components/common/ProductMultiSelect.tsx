import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "../ui/utils";
import { Button } from "../ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "../ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../ui/popover";
import { Badge } from "../ui/badge";
import { Product } from "../../types";

interface ProductMultiSelectProps {
    products: Product[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
    placeholder?: string;
}

export function ProductMultiSelect({
    products,
    selectedIds,
    onChange,
    placeholder = "Seleccionar productos...",
}: ProductMultiSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");

    // Filtrar productos con stock > 0 y que coincidan con la búsqueda
    const filteredProducts = React.useMemo(() => {
        return products.filter((product) => {
            const hasStock = product.stock > 0;
            const matchesSearch = product.name
                .toLowerCase()
                .includes(inputValue.toLowerCase());
            return hasStock && matchesSearch;
        });
    }, [products, inputValue]);

    const handleSelect = (productId: number) => {
        if (selectedIds.includes(productId)) {
            onChange(selectedIds.filter((id) => id !== productId));
        } else {
            onChange([...selectedIds, productId]);
        }
    };

    const handleRemove = (productId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(selectedIds.filter((id) => id !== productId));
    };

    // Obtener los productos seleccionados para mostrarlos
    const selectedProducts = products.filter((p) => selectedIds.includes(p.id));

    return (
        <div className="space-y-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between h-auto min-h-10 py-2"
                    >
                        <span className="truncate text-muted-foreground font-normal">
                            {selectedIds.length > 0
                                ? `${selectedIds.length} productos seleccionados`
                                : placeholder}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder="Buscar producto..."
                            value={inputValue}
                            onValueChange={setInputValue}
                        />
                        <CommandList>
                            <CommandEmpty>No se encontraron productos con stock.</CommandEmpty>
                            <CommandGroup className="max-h-64 overflow-auto">
                                {filteredProducts.map((product) => (
                                    <CommandItem
                                        key={product.id}
                                        value={product.name}
                                        onSelect={() => handleSelect(product.id)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedIds.includes(product.id)
                                                    ? "opacity-100"
                                                    : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span>{product.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                Stock: {product.stock} | ${product.price}
                                            </span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {/* Badges de productos seleccionados */}
            {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                    {selectedProducts.map((product) => (
                        <Badge key={product.id} variant="secondary" className="pr-1">
                            {product.name}
                            <button
                                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleRemove(product.id, e as any);
                                    }
                                }}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                onClick={(e) => handleRemove(product.id, e)}
                            >
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
