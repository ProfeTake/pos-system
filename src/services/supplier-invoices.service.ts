import { apiFetchJSON, postJSON, putJSON, deleteJSON } from "../lib/api";
import {
  SupplierInvoice,
  SupplierInvoiceWithDetails,
  SupplierInvoiceCreate,
  InvoicePaymentCreate,
  InvoiceStats,
  InvoicePaymentStatus,
  ExpenseCategory,
} from "../types";

interface InvoiceFilters {
  status?: InvoicePaymentStatus | 'all';
  supplier?: string;
  category?: ExpenseCategory;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'invoiceDate' | 'dueDate' | 'total';
  sortOrder?: 'asc' | 'desc';
}

export const supplierInvoicesService = {
  /**
   * Obtener todas las facturas con filtros opcionales
   */
  async getAll(filters: InvoiceFilters = {}) {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.supplier) params.append('supplier', filters.supplier);
    if (filters.category) params.append('category', filters.category);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const url = queryString ? `/api/supplier-invoices?${queryString}` : '/api/supplier-invoices';
    
    const invoices = await apiFetchJSON<any[]>(url);
    return invoices.map(inv => ({
      ...inv,
      invoiceDate: new Date(inv.invoiceDate),
      dueDate: inv.dueDate ? new Date(inv.dueDate) : undefined,
      createdAt: new Date(inv.createdAt),
      updatedAt: inv.updatedAt ? new Date(inv.updatedAt) : undefined,
    })) as SupplierInvoice[];
  },

  /**
   * Obtener una factura por ID con todos sus detalles
   */
  async getById(id: number) {
    const invoice = await apiFetchJSON<any>(`/api/supplier-invoices/${id}`);
    return {
      ...invoice,
      invoiceDate: new Date(invoice.invoiceDate),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
      createdAt: new Date(invoice.createdAt),
      updatedAt: invoice.updatedAt ? new Date(invoice.updatedAt) : undefined,
      payments: invoice.payments?.map((p: any) => ({
        ...p,
        paymentDate: new Date(p.paymentDate),
        createdAt: new Date(p.createdAt),
      })) || [],
    } as SupplierInvoiceWithDetails;
  },

  /**
   * Crear nueva factura
   */
  async create(data: SupplierInvoiceCreate) {
    const invoice = await postJSON<any>('/api/supplier-invoices', data);
    return {
      ...invoice,
      invoiceDate: new Date(invoice.invoiceDate),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
      createdAt: new Date(invoice.createdAt),
    } as SupplierInvoice;
  },

  /**
   * Actualizar factura
   */
  async update(id: number, data: Partial<SupplierInvoiceCreate>) {
    const invoice = await putJSON<any>(`/api/supplier-invoices/${id}`, data);
    return {
      ...invoice,
      invoiceDate: new Date(invoice.invoiceDate),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
      createdAt: new Date(invoice.createdAt),
      updatedAt: invoice.updatedAt ? new Date(invoice.updatedAt) : undefined,
    } as SupplierInvoice;
  },

  /**
   * Eliminar factura
   */
  async delete(id: number) {
    return deleteJSON(`/api/supplier-invoices/${id}`);
  },

  /**
   * Registrar pago en una factura
   */
  async registerPayment(invoiceId: number, data: InvoicePaymentCreate) {
    const payment = await postJSON<any>(`/api/supplier-invoices/${invoiceId}/payments`, data);
    return {
      ...payment,
      paymentDate: new Date(payment.paymentDate),
      createdAt: new Date(payment.createdAt),
    };
  },

  /**
   * Obtener estadísticas de facturas
   */
  async getStats(dateFrom?: string, dateTo?: string) {
    const params = new URLSearchParams();
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    
    const queryString = params.toString();
    const url = queryString ? `/api/supplier-invoices/stats?${queryString}` : '/api/supplier-invoices/stats';
    
    return apiFetchJSON<InvoiceStats>(url);
  },

  /**
   * Obtener lista de proveedores únicos
   */
  async getSuppliers() {
    const invoices = await this.getAll();
    const suppliers = [...new Set(invoices.map(inv => inv.supplierName))];
    return suppliers.sort();
  },

  /**
   * Exportar facturas a CSV
   */
  exportToCSV(invoices: SupplierInvoice[]) {
    const headers = [
      'Número Factura',
      'Proveedor',
      'Fecha Emisión',
      'Fecha Vencimiento',
      'Subtotal',
      'IVA',
      'Total',
      'Estado',
      'Pagado',
      'Pendiente',
      'Categoría',
      'Código Contable',
      'Descripción',
    ];

    const rows = invoices.map(inv => [
      inv.invoiceNumber,
      inv.supplierName,
      inv.invoiceDate.toLocaleDateString('es-CL'),
      inv.dueDate?.toLocaleDateString('es-CL') || '-',
      inv.subtotal,
      inv.taxAmount,
      inv.total,
      inv.paymentStatus,
      inv.amountPaid,
      inv.amountPending,
      inv.expenseCategory,
      inv.accountingCode || '-',
      inv.description || '-',
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Descargar archivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `facturas_proveedores_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  },
};
