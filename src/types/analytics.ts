// Tipos compartidos (duplicado controlado). Ideal futuro: mover a paquete compartido.
export interface SalesMetrics {
  totalSales: number;
  totalRevenue: number;
  avgTicket: number;
}
export interface PaymentMethodStat {
  paymentMethod: string;
  count: number;
  total: number;
}
export interface ProductRevenueStat {
  id: number;
  name: string;
  category: string;
  totalQuantity: number;
  totalRevenue: number;
  totalProfit: number;
}
export interface ProductMarginStat extends ProductRevenueStat {
  avgMargin: number;
}
export interface CategoryStat {
  category: string;
  totalQuantity: number;
  totalRevenue: number;
  totalProfit: number;
}
export interface StagnantProduct {
  id: number;
  name: string;
  category: string;
  stock: number;
  price: number;
  inventoryValue: number;
  lastSaleDate: string | null;
}
export interface MetricsResponse {
  ok: true;
  period: string;
  sales: SalesMetrics;
  paymentMethods: PaymentMethodStat[];
  topProducts: ProductRevenueStat[];
  topMargin: ProductMarginStat[];
  categoryStats: CategoryStat[];
  stagnantProducts: StagnantProduct[];
}
export interface TrendPoint {
  date: string;
  salesCount: number;
  revenue: number;
  avgTicket: number;
}
export interface SalesTrendResponse {
  ok: true;
  days: number;
  trend: TrendPoint[];
}
export interface HourlyStat {
  hour: number;
  salesCount: number;
  revenue: number;
}
export interface SalesByHourResponse {
  ok: true;
  period: string;
  hourlyStats: HourlyStat[];
}
export interface InventoryRotationItem {
  id: number;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  soldQuantity: number;
  rotationDays: number | null;
  daysOfStock: number | null;
}
export interface InventoryRotationResponse {
  ok: true;
  days: number;
  rotation: InventoryRotationItem[];
}
export interface PeriodComparisonChanges {
  salesCount: number;
  revenue: number;
  avgTicket: number;
}
export interface PeriodComparisonResponse {
  ok: true;
  period: string;
  comparison: {
    current: SalesMetrics;
    previous: SalesMetrics;
    changes: PeriodComparisonChanges;
  };
}
export interface RestockPredictionItem {
  id: number;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  soldInPeriod: number;
  avgDailySales: number;
  daysUntilEmpty: number | null;
  daysUntilReorder: number | null;
}
export interface RestockPredictionsResponse {
  ok: true;
  days: number;
  predictions: RestockPredictionItem[];
}
