import { Router } from "express";
import * as supplierInvoicesController from "../controllers/supplierInvoices.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /api/supplier-invoices - Obtener todas las facturas (con filtros)
router.get("/", supplierInvoicesController.getAll);

// GET /api/supplier-invoices/stats - Obtener estadísticas
router.get("/stats", supplierInvoicesController.getStats);

// GET /api/supplier-invoices/:id - Obtener una factura por ID
router.get("/:id", supplierInvoicesController.getById);

// POST /api/supplier-invoices - Crear nueva factura
router.post("/", supplierInvoicesController.create);

// PUT /api/supplier-invoices/:id - Actualizar factura
router.put("/:id", supplierInvoicesController.update);

// DELETE /api/supplier-invoices/:id - Eliminar factura
router.delete("/:id", supplierInvoicesController.deleteInvoice);

// POST /api/supplier-invoices/:id/payments - Registrar pago
router.post("/:id/payments", supplierInvoicesController.registerPayment);

export default router;
