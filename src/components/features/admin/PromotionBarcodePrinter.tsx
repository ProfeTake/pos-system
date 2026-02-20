import React, { useRef } from "react";
import Barcode from "react-barcode";
import { Button } from "../../ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../ui/dialog";
import { Printer, Download } from "lucide-react";
import { Promotion } from "../../../types";
import { toast } from "sonner";

interface PromotionBarcodePrinterProps {
    promotion: Promotion;
    open: boolean;
    onClose: () => void;
}

export function PromotionBarcodePrinter({
    promotion,
    open,
    onClose,
}: PromotionBarcodePrinterProps) {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        if (!printRef.current) return;

        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            toast.error("No se pudo abrir la ventana de impresión");
            return;
        }

        const content = printRef.current.innerHTML;
        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Código de Barras - ${promotion.name}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .barcode-container {
              text-align: center;
              padding: 20px;
              border: 2px dashed #ccc;
              border-radius: 8px;
              background: white;
            }
            h2 {
              margin: 0 0 10px 0;
              font-size: 24px;
              color: #333;
            }
            .description {
              margin: 10px 0;
              color: #666;
              font-size: 14px;
            }
            .discount {
              margin: 10px 0;
              font-size: 20px;
              font-weight: bold;
              color: #e11d48;
            }
            .validity {
              margin: 10px 0;
              font-size: 12px;
              color: #888;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);

        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);

        toast.success("Preparando impresión...");
    };

    const handleDownload = () => {
        if (!printRef.current) return;

        // Create a canvas to convert the barcode to image
        const svg = printRef.current.querySelector("svg");
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `${promotion.barcode || "promocion"}.png`;
                link.click();
                URL.revokeObjectURL(url);
                toast.success("Código de barras descargado");
            });
        };

        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

    const getPromotionValue = () => {
        switch (promotion.type) {
            case "percentage":
                return `${promotion.value}% de descuento`;
            case "fixed":
                return `$${promotion.value?.toLocaleString("es-CL")} de descuento`;
            case "2x1":
                return "2x1 - Lleva 2 paga 1";
            case "3x2":
                return "3x2 - Lleva 3 paga 2";
            case "bundle":
                return `${promotion.bundleQty} x $${promotion.bundlePrice?.toLocaleString("es-CL")}`;
            default:
                return "Oferta especial";
        }
    };

    const getValidityText = () => {
        if (!promotion.endDate) return "Sin fecha de expiración";
        const endDate = new Date(promotion.endDate);
        return `Válido hasta: ${endDate.toLocaleDateString("es-CL")}`;
    };

    if (!promotion.barcode) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Código de Barras de Promoción</DialogTitle>
                    <DialogDescription>
                        Imprime o descarga el código de barras para usar en el punto de venta
                    </DialogDescription>
                </DialogHeader>

                <div ref={printRef} className="barcode-container p-8 border-2 border-dashed rounded-lg">
                    <h2 className="text-2xl font-bold mb-2">{promotion.name}</h2>

                    {promotion.description && (
                        <p className="description text-sm text-muted-foreground mb-4">
                            {promotion.description}
                        </p>
                    )}

                    <div className="discount text-xl font-bold text-primary mb-4">
                        {getPromotionValue()}
                    </div>

                    <div className="flex justify-center my-6">
                        <Barcode
                            value={promotion.barcode}
                            format="CODE128"
                            width={2}
                            height={80}
                            displayValue={true}
                            fontSize={16}
                            margin={10}
                        />
                    </div>

                    <div className="validity text-xs text-muted-foreground">
                        {getValidityText()}
                    </div>

                    {promotion.maxUses && (
                        <div className="text-xs text-muted-foreground mt-2">
                            Usos disponibles: {promotion.maxUses - promotion.usedCount}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                    <Button variant="secondary" onClick={handleDownload}>
                        <Download className="size-4 mr-2" />
                        Descargar
                    </Button>
                    <Button onClick={handlePrint}>
                        <Printer className="size-4 mr-2" />
                        Imprimir
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
