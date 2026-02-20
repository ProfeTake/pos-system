import { Card, CardContent, CardFooter } from "../../ui/card";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Tag, Percent, Gift, Barcode } from "lucide-react";
import { Promotion } from "../../../types";
import { Product } from "../../../types";
import { memo } from "react";

interface PromotionCardProps {
    promotion: Promotion;
    products: Product[];
    onScanPromotion: (promotion: Promotion) => void;
}

/**
 * PromotionCard component to display active promotions in the catalog
 */
export const PromotionCard = memo(function PromotionCard({
    promotion,
    products,
    onScanPromotion,
}: PromotionCardProps) {
    const getPromotionIcon = () => {
        switch (promotion.type) {
            case "percentage":
                return <Percent className="size-5" />;
            case "2x1":
            case "3x2":
            case "bundle":
                return <Gift className="size-5" />;
            default:
                return <Tag className="size-5" />;
        }
    };

    const getPromotionValue = () => {
        switch (promotion.type) {
            case "percentage":
                return `${promotion.value}% OFF`;
            case "fixed":
                return `$${promotion.value?.toLocaleString("es-CL")} OFF`;
            case "2x1":
                return "2x1";
            case "3x2":
                return "3x2";
            case "bundle":
                return `${promotion.bundleQty} x $${promotion.bundlePrice?.toLocaleString("es-CL")}`;
            default:
                return "Oferta";
        }
    };

    const getApplicableProducts = () => {
        if (promotion.scope === "all") {
            return "Todos los productos";
        } else if (promotion.scope === "category") {
            return `Categoría: ${promotion.categoryName}`;
        } else if (promotion.scope === "product" && promotion.productIds) {
            const productNames = products
                .filter((p) => promotion.productIds?.includes(p.id))
                .map((p) => p.name)
                .slice(0, 2);
            const remaining = (promotion.productIds.length || 0) - productNames.length;
            return productNames.join(", ") + (remaining > 0 ? ` +${remaining} más` : "");
        }
        return "";
    };

    const getValidityText = () => {
        if (!promotion.endDate) return "Sin fecha de expiración";
        const endDate = new Date(promotion.endDate);
        const now = new Date();
        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysLeft < 0) return "Expirada";
        if (daysLeft === 0) return "Expira hoy";
        if (daysLeft === 1) return "Expira mañana";
        return `Expira en ${daysLeft} días`;
    };

    return (
        <Card className="flex h-full min-h-[360px] flex-col bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="flex flex-1 flex-col justify-between gap-4 p-6">
                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 text-primary">
                            {getPromotionIcon()}
                            <h3 className="font-bold text-lg leading-tight">
                                {promotion.name}
                            </h3>
                        </div>
                        <Badge variant="default" className="text-xs font-bold">
                            {getPromotionValue()}
                        </Badge>
                    </div>

                    {promotion.description && (
                        <p className="text-sm text-muted-foreground">
                            {promotion.description}
                        </p>
                    )}

                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                                {getApplicableProducts()}
                            </Badge>
                        </div>

                        {promotion.barcode && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Barcode className="size-3" />
                                <code className="font-mono">{promotion.barcode}</code>
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                            {getValidityText()}
                        </p>

                        {promotion.maxUses && (
                            <p className="text-xs text-muted-foreground">
                                Usos: {promotion.usedCount}/{promotion.maxUses}
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>

            <CardFooter className="p-6 pt-0">
                <Button
                    onClick={() => onScanPromotion(promotion)}
                    className="w-full h-10"
                    variant="default"
                >
                    <Tag className="size-4 mr-2" />
                    Aplicar Promoción
                </Button>
            </CardFooter>
        </Card>
    );
});
