import { Router } from 'express';
import {
  getReturns,
  getReturnById,
  createReturn,
  getReturnsBySale,
  getReturnStats,
  updateReturn,
} from '../controllers/returns.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission, PERMISSIONS } from '../middlewares/permissions.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Return routes
router.get('/', requirePermission(PERMISSIONS.SALES_VIEW), getReturns);
router.get('/stats', requirePermission(PERMISSIONS.SALES_VIEW), getReturnStats);
router.get('/:id', requirePermission(PERMISSIONS.SALES_VIEW), getReturnById);
router.get('/sale/:saleId', requirePermission(PERMISSIONS.SALES_VIEW), getReturnsBySale);
router.post('/', requirePermission(PERMISSIONS.SALES_CANCEL), createReturn);
router.patch('/:id', requirePermission(PERMISSIONS.SALES_CANCEL), updateReturn);

export default router;
