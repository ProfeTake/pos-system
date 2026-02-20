import { Router } from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  toggleCustomer,
  recordCustomerPurchase,
  getCustomerDebts,
  createCustomerDebt,
  recordDebtPayment,
  getCustomerStats,
} from '../controllers/customers.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { requirePermission, PERMISSIONS } from '../middlewares/permissions.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Customer routes
router.get('/', requirePermission(PERMISSIONS.CUSTOMERS_VIEW), getCustomers);
router.get('/stats', requirePermission(PERMISSIONS.CUSTOMERS_VIEW), getCustomerStats);
router.get('/:id', requirePermission(PERMISSIONS.CUSTOMERS_VIEW), getCustomerById);
router.post('/', requirePermission(PERMISSIONS.CUSTOMERS_MANAGE), createCustomer);
router.patch('/:id', requirePermission(PERMISSIONS.CUSTOMERS_MANAGE), updateCustomer);
router.delete('/:id', requirePermission(PERMISSIONS.CUSTOMERS_MANAGE), deleteCustomer);
router.post('/:id/toggle', requirePermission(PERMISSIONS.CUSTOMERS_MANAGE), toggleCustomer);
router.post('/:id/purchase', requirePermission(PERMISSIONS.SALES_CREATE), recordCustomerPurchase);

// Debt routes
router.get('/:id/debts', requirePermission(PERMISSIONS.CUSTOMERS_CREDIT), getCustomerDebts);
router.post('/:id/debts', requirePermission(PERMISSIONS.CUSTOMERS_CREDIT), createCustomerDebt);
router.post('/debts/:debtId/payment', requirePermission(PERMISSIONS.CUSTOMERS_CREDIT), recordDebtPayment);

export default router;
