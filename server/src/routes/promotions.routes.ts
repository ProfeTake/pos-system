import { Router } from "express";
import {
  getAll,
  getActive,
  getById,
  getByBarcode,
  create,
  update,
  remove,
  toggle,
  registerUse,
} from "../controllers/promotions.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticateToken);

// Listar todas las promociones
router.get("/", getAll);

// Obtener solo promociones activas (para aplicar en ventas)
router.get("/active", getActive);

// Buscar promoción por código de barras
router.get("/barcode/:code", getByBarcode);

// Obtener promoción por ID
router.get("/:id", getById);

// Crear nueva promoción
router.post("/", create);

// Actualizar promoción
router.put("/:id", update);

// Eliminar promoción
router.delete("/:id", remove);

// Activar/desactivar promoción
router.post("/:id/toggle", toggle);

// Registrar uso de promoción
router.post("/:id/use", registerUse);

export default router;
