import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import { tenantMiddleware } from "./middlewares/tenant.middleware";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const PORT = process.env.PORT || 3002;

// CORS básico
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));

// Body parser
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Tenant (single-tenant friendly if SINGLE_TENANT=true)
app.use(tenantMiddleware);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// Routes
import authRoutes from "./routes/auth.routes";
import productRoutes from "./routes/products.routes";
import salesRoutes from "./routes/sales.routes";
import settingsRoutes from "./routes/settings.routes";
import eventsRoutes from "./routes/events.routes";
import cashSessionRoutes from "./routes/cashSession.routes";
import cashMovementsRoutes from "./routes/cashMovements.routes";
import analyticsRoutes from "./routes/analytics.routes";
import promotionsRoutes from "./routes/promotions.routes";
import auditRoutes from "./routes/audit.routes";
import superadminRoutes from "./routes/superadmin.routes";
import storeUsersRoutes from "./routes/storeUsers.routes";
import categoryThresholdsRoutes from "./routes/categoryThresholds.routes";
import configurationsRoutes from "./routes/configurations.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import customersRoutes from "./routes/customers.routes";
import returnsRoutes from "./routes/returns.routes";
import fiscalRoutes from "./routes/fiscal.routes";
import supplierInvoicesRoutes from "./routes/supplierInvoices.routes";

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/cash-session", cashSessionRoutes);
app.use("/api/cash-movements", cashMovementsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/promotions", promotionsRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/store-users", storeUsersRoutes);
app.use("/api/category-thresholds", categoryThresholdsRoutes);
app.use("/api/configurations", configurationsRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/returns", returnsRoutes);
app.use("/api/fiscal", fiscalRoutes);
app.use("/api/supplier-invoices", supplierInvoicesRoutes);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌍 API URL: http://localhost:${PORT}`);
});