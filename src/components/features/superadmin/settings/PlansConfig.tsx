/**
 * Plans Configuration
 * Configuración de planes de suscripción
 */

import { useState } from "react";
import { Plus, Edit2, Check, X, Users, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../ui/card";
import { Badge } from "../../../ui/badge";

interface PlanFeature {
  name: string;
  included: boolean;
  limit?: number;
}

interface Plan {
  id: number;
  name: string;
  slug: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: PlanFeature[];
  isPopular: boolean;
  isActive: boolean;
  subscriberCount: number;
}

const mockPlans: Plan[] = [
  {
    id: 1,
    name: "Básico",
    slug: "basic",
    monthlyPrice: 14990,
    yearlyPrice: 149990,
    description: "Ideal para pequeños negocios",
    features: [
      { name: "Usuarios", included: true, limit: 2 },
      { name: "Productos", included: true, limit: 500 },
      { name: "Ventas/mes", included: true, limit: 1000 },
      { name: "Reportes básicos", included: true },
      { name: "Soporte email", included: true },
      { name: "API Access", included: false },
      { name: "Integraciones", included: false },
    ],
    isPopular: false,
    isActive: true,
    subscriberCount: 45,
  },
  {
    id: 2,
    name: "Profesional",
    slug: "professional",
    monthlyPrice: 29990,
    yearlyPrice: 299990,
    description: "Para negocios en crecimiento",
    features: [
      { name: "Usuarios", included: true, limit: 5 },
      { name: "Productos", included: true, limit: 2000 },
      { name: "Ventas/mes", included: true, limit: 5000 },
      { name: "Reportes avanzados", included: true },
      { name: "Soporte prioritario", included: true },
      { name: "API Access", included: true },
      { name: "Integraciones", included: false },
    ],
    isPopular: true,
    isActive: true,
    subscriberCount: 78,
  },
  {
    id: 3,
    name: "Empresarial",
    slug: "enterprise",
    monthlyPrice: 49990,
    yearlyPrice: 499990,
    description: "Solución completa para empresas",
    features: [
      { name: "Usuarios", included: true, limit: -1 },
      { name: "Productos", included: true, limit: -1 },
      { name: "Ventas/mes", included: true, limit: -1 },
      { name: "Reportes personalizados", included: true },
      { name: "Soporte 24/7", included: true },
      { name: "API Access", included: true },
      { name: "Integraciones", included: true },
    ],
    isPopular: false,
    isActive: true,
    subscriberCount: 23,
  },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(
    amount
  );

export function PlansConfig() {
  const [plans, setPlans] = useState(mockPlans);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const handleToggleActive = (planId: number) => {
    setPlans(
      plans.map((p) => (p.id === planId ? { ...p, isActive: !p.isActive } : p))
    );
    toast.success("Estado del plan actualizado");
  };

  const handleSavePlan = () => {
    toast.success("Plan guardado correctamente");
    setEditingPlan(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración de Planes</h1>
          <p className="text-muted-foreground mt-1">
            Administra los planes de suscripción disponibles
          </p>
        </div>
        <Button onClick={() => toast.info("Función en desarrollo")}>
          <Plus className="size-4 mr-2" />
          Nuevo Plan
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative overflow-hidden ${
              plan.isPopular ? "border-primary" : ""
            } ${!plan.isActive ? "opacity-60" : ""}`}
          >
            {plan.isPopular && (
              <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-bl-lg flex items-center gap-1">
                <Star className="size-3" />
                Popular
              </div>
            )}

            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Pricing */}
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    {formatCurrency(plan.monthlyPrice)}
                  </span>
                  <span className="text-muted-foreground">/mes</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  o {formatCurrency(plan.yearlyPrice)}/año (ahorra 2 meses)
                </p>
              </div>

              {/* Features */}
              <div className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    {feature.included ? (
                      <Check className="size-4 text-green-500" />
                    ) : (
                      <X className="size-4 text-muted-foreground/50" />
                    )}
                    <span
                      className={
                        feature.included ? "" : "text-muted-foreground/50"
                      }
                    >
                      {feature.name}
                      {feature.limit !== undefined && feature.limit > 0 && (
                        <span className="text-muted-foreground ml-1">
                          (hasta {feature.limit.toLocaleString()})
                        </span>
                      )}
                      {feature.limit === -1 && (
                        <span className="text-green-500 ml-1">(Ilimitado)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              {/* Stats & Actions */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="size-4" />
                    <span className="text-sm">
                      {plan.subscriberCount} suscriptores
                    </span>
                  </div>
                  <Badge variant={plan.isActive ? "default" : "secondary"}>
                    {plan.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingPlan(plan)}
                  >
                    <Edit2 className="size-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant={plan.isActive ? "destructive" : "default"}
                    size="icon"
                    onClick={() => handleToggleActive(plan.id)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Plan Dialog */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Editar Plan: {editingPlan.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={editingPlan.name}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-muted border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  value={editingPlan.description}
                  onChange={(e) =>
                    setEditingPlan({
                      ...editingPlan,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2.5 bg-muted border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    Precio Mensual
                  </label>
                  <input
                    type="number"
                    value={editingPlan.monthlyPrice}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        monthlyPrice: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 bg-muted border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">
                    Precio Anual
                  </label>
                  <input
                    type="number"
                    value={editingPlan.yearlyPrice}
                    onChange={(e) =>
                      setEditingPlan({
                        ...editingPlan,
                        yearlyPrice: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 bg-muted border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPopular"
                  checked={editingPlan.isPopular}
                  onChange={(e) =>
                    setEditingPlan({
                      ...editingPlan,
                      isPopular: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <label htmlFor="isPopular">Marcar como popular</label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setEditingPlan(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleSavePlan}>Guardar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default PlansConfig;
