import { useState, useEffect } from "react";
import {
  getPlans,
  getCurrentSubscription,
  changePlan,
  Plan,
  CurrentSubscription,
} from "../../../services/subscription.service";
import { Check, AlertTriangle, TrendingUp, Users, Package, ShoppingCart } from "lucide-react";

export default function SubscriptionManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSub, setCurrentSub] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState(false);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansData, subData] = await Promise.all([
        getPlans(),
        getCurrentSubscription(),
      ]);
      setPlans(plansData);
      setCurrentSub(subData);
    } catch (error) {
      console.error("Error loading subscription data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async (planCode: string) => {
    if (!confirm(`¿Estás seguro de cambiar al plan ${planCode}?`)) return;

    try {
      setChangingPlan(true);
      await changePlan(planCode, selectedBillingCycle);
      alert("Plan cambiado exitosamente");
      await loadData();
    } catch (error: any) {
      alert(error.message || "Error al cambiar de plan");
    } finally {
      setChangingPlan(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(price);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Plan Actual y Uso */}
      {currentSub && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Tu Plan Actual</h2>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-blue-600">
                {currentSub.plan.name}
              </h3>
              <p className="text-gray-600">
                {formatPrice(currentSub.plan.priceMonthly)}/mes
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              currentSub.subscription.status === "active"
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}>
              {currentSub.subscription.status === "active" ? "Activo" : "Prueba"}
            </span>
          </div>

          {/* Estadísticas de Uso */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-700">Uso de Recursos</h4>

            {/* Productos */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <Package size={16} />
                  Productos
                </span>
                <span className="font-medium">
                  {currentSub.usage.totalProducts}
                  {currentSub.limits.maxProducts && ` / ${currentSub.limits.maxProducts}`}
                  {!currentSub.limits.maxProducts && " / Ilimitado"}
                </span>
              </div>
              {currentSub.limits.maxProducts && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${getProgressColor(currentSub.percentage.products)} h-2 rounded-full transition-all`}
                    style={{ width: `${Math.min(currentSub.percentage.products, 100)}%` }}
                  />
                </div>
              )}
              {currentSub.warnings.products && (
                <p className="text-yellow-600 text-sm mt-1 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  Cerca del límite
                </p>
              )}
            </div>

            {/* Usuarios */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <Users size={16} />
                  Usuarios
                </span>
                <span className="font-medium">
                  {currentSub.usage.totalUsers}
                  {currentSub.limits.maxUsers && ` / ${currentSub.limits.maxUsers}`}
                  {!currentSub.limits.maxUsers && " / Ilimitado"}
                </span>
              </div>
              {currentSub.limits.maxUsers && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${getProgressColor(currentSub.percentage.users)} h-2 rounded-full transition-all`}
                    style={{ width: `${Math.min(currentSub.percentage.users, 100)}%` }}
                  />
                </div>
              )}
              {currentSub.warnings.users && (
                <p className="text-yellow-600 text-sm mt-1 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  Cerca del límite
                </p>
              )}
            </div>

            {/* Ventas del mes */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <ShoppingCart size={16} />
                  Ventas este mes
                </span>
                <span className="font-medium">
                  {currentSub.usage.salesThisMonth}
                  {currentSub.limits.maxSalesPerMonth && ` / ${currentSub.limits.maxSalesPerMonth}`}
                  {!currentSub.limits.maxSalesPerMonth && " / Ilimitado"}
                </span>
              </div>
              {currentSub.limits.maxSalesPerMonth && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${getProgressColor(currentSub.percentage.sales)} h-2 rounded-full transition-all`}
                    style={{ width: `${Math.min(currentSub.percentage.sales, 100)}%` }}
                  />
                </div>
              )}
              {currentSub.warnings.sales && (
                <p className="text-yellow-600 text-sm mt-1 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  Cerca del límite
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selector de Ciclo de Facturación */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Planes Disponibles</h2>
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setSelectedBillingCycle("monthly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedBillingCycle === "monthly"
                  ? "bg-white shadow-sm text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setSelectedBillingCycle("yearly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedBillingCycle === "yearly"
                  ? "bg-white shadow-sm text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Anual
              <span className="ml-1 text-green-600 text-xs">Ahorra 17%</span>
            </button>
          </div>
        </div>

        {/* Grid de Planes */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrentPlan = currentSub?.plan.code === plan.code;
            const price = selectedBillingCycle === "monthly" 
              ? plan.priceMonthly 
              : Math.round(plan.priceYearly / 12);

            return (
              <div
                key={plan.id}
                className={`border-2 rounded-lg p-6 ${
                  isCurrentPlan
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                } transition-all`}
              >
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{formatPrice(price)}</span>
                  <span className="text-gray-600">/mes</span>
                  {selectedBillingCycle === "yearly" && (
                    <p className="text-sm text-gray-500">
                      {formatPrice(plan.priceYearly)} facturado anualmente
                    </p>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-4">{plan.description}</p>

                {/* Límites */}
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-start gap-2">
                    <Package size={16} className="mt-0.5 text-gray-500" />
                    <span>
                      {plan.isUnlimited.products 
                        ? "Productos ilimitados" 
                        : `${plan.maxProducts} productos`}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users size={16} className="mt-0.5 text-gray-500" />
                    <span>
                      {plan.isUnlimited.users 
                        ? "Usuarios ilimitados" 
                        : `${plan.maxUsers} usuarios`}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShoppingCart size={16} className="mt-0.5 text-gray-500" />
                    <span>
                      {plan.isUnlimited.sales 
                        ? "Ventas ilimitadas" 
                        : `${plan.maxSalesPerMonth} ventas/mes`}
                    </span>
                  </li>
                </ul>

                {/* Features */}
                <ul className="space-y-2 mb-6 text-sm">
                  {plan.features.slice(0, 5).map((feature: string) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check size={16} className="text-green-500 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                  {plan.features.length > 5 && (
                    <li className="text-gray-500 text-xs">
                      +{plan.features.length - 5} más...
                    </li>
                  )}
                </ul>

                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full py-2 px-4 bg-gray-200 text-gray-600 rounded-lg font-medium cursor-not-allowed"
                  >
                    Plan Actual
                  </button>
                ) : (
                  <button
                    onClick={() => handleChangePlan(plan.code)}
                    disabled={changingPlan}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <TrendingUp size={16} />
                    {currentSub && plans.findIndex(p => p.code === currentSub.plan.code) < plans.findIndex(p => p.code === plan.code)
                      ? "Mejorar Plan"
                      : "Cambiar a Este Plan"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
