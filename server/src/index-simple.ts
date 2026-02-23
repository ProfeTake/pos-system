import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import { tenantMiddleware } from "./middlewares/tenant.middleware";

// En producción (Docker), las env vars vienen del entorno (Railway).
// En desarrollo, cargar desde .env local.
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
}

const app = express();
const PORT = process.env.PORT || 3002;

// CORS - permitir orígenes locales y producción
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];
if (process.env.RAILWAY_PUBLIC_DOMAIN) {
  allowedOrigins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
}

app.use(cors({
  origin: allowedOrigins,
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

// En producción, servir el frontend React (build estático)
if (process.env.NODE_ENV === "production") {
  const fs = require("fs");
  const frontendPath = path.resolve(__dirname, "../../frontend");
  const indexPath = path.join(frontendPath, "index.html");
  
  console.log(`📂 Frontend path: ${frontendPath}`);
  console.log(`📄 Index exists: ${fs.existsSync(indexPath)}`);

  if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
  }

  // SPA fallback: cualquier ruta no-API devuelve index.html
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith("/api")) {
      res.status(404).json({ error: "Endpoint no encontrado" });
    } else if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(500).json({ error: "Frontend no disponible", path: frontendPath });
    }
  });
}

// Error handler (debe ir al final)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// 404 handler
if (process.env.NODE_ENV !== "production") {
  app.use((req: express.Request, res: express.Response) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
  });
}

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌍 API URL: http://0.0.0.0:${PORT}`);
});