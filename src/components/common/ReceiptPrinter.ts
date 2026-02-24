export type ReceiptItem = {
  name: string;
  qty: number;
  unitPrice: number;
};

export type ReceiptData = {
  storeName: string;
  saleNumber: string | number;
  date: Date;
  paymentMethod: string;
  customerName?: string;
  items: ReceiptItem[];
  total: number;
};

// Datos para resumen de turno
export interface ShiftSummaryData {
  storeName: string;
  generatedAt: Date;
  windowLabel: string; // p.ej. "Turno 04-10-2025 08:00 - 04-10-2025 23:59"
  totalSales: number; // cantidad de ventas
  grandTotal: number; // suma total de todas las ventas
  byMethod: { cash: number; debit: number; credit: number; transfer: number };
}

// Resumen de movimientos de caja (excluye ventas)
export interface CashMovementsSummaryData {
  storeName: string;
  generatedAt: Date;
  windowLabel: string;
  openingAmount: number;
  inflow: number; // suma de ingresos (monto > 0)
  outflow: number; // suma de egresos (abs de montos < 0)
  net: number; // inflow - outflow (solo movimientos)
  closingBalance?: number; // openingAmount + inflow - outflow
  byMethod: Record<string, { inflow: number; outflow: number }>;
  movements: Array<{
    date: string; // string compacto para ticket (p.ej. 18-10 10:25)
    type: string; // ya traducido a español
    method: string; // ya traducido a español
    description: string;
    amount: number; // puede ser negativo
  }>;
}

const formatCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function printSaleReceipt(data: ReceiptData, receiptType?: string) {
  const html = getReceiptHtml(data, receiptType);
  const documentType = receiptType || "Boleta";
  const pdfTitle = `${documentType}_N${data.saleNumber}`;
  printViaIframe(html, pdfTitle);
}

export function getReceiptHtml(
  data: ReceiptData,
  receiptType?: string
): string {
  const dateStr = data.date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const documentType = receiptType || "Boleta";
  const lines = data.items
    .map((it) => {
      const subtotal = it.qty * it.unitPrice;
      return `
        <tr class="row">
          <td class="l name">${escapeHtml(it.name)}</td>
          <td class="c qty">${it.qty}</td>
          <td class="r price">${formatCLP(it.unitPrice)}</td>
          <td class="r sub">${formatCLP(subtotal)}</td>
        </tr>`;
    })
    .join("");

  const html = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(documentType)} ${data.saleNumber}</title>
<style>
  @page { size: 65mm auto; margin: 2mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { 
    background-color: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body { 
    font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 11px; 
    color: #000; 
    line-height: 1.3;
    padding: 2mm;
    -webkit-font-smoothing: antialiased;
  }
  .ticket { width: 100%; max-width: 61mm; margin: 0 auto; background-color: #fff; }
  .center { text-align: center; }
  .l { text-align: left; } 
  .r { text-align: right; } 
  .c { text-align: center; }
  h1 { font-size: 18px; margin: 0 0 4px; font-weight: 700; letter-spacing: 0.5px; }
  .muted { color: #000; font-weight: 500; font-size: 11px; margin: 2px 0; }
  .hr { border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .head th { font-weight: 700; border-bottom: 1px dashed #000; padding: 4px 0; font-size: 10px; text-transform: uppercase; }
  .row td { padding: 3px 0; vertical-align: top; }
  .name { width: 42%; padding-right: 4px; word-wrap: break-word; font-weight: 500; }
  .qty { width: 12%; font-weight: 600; }
  .price { width: 22%; }
  .sub { width: 24%; font-weight: 600; }
  .total { font-weight: 700; font-size: 14px; }
  .footer { margin-top: 8px; font-size: 11px; font-weight: 500; }
  @media print {
    .no-print { display: none; }
    body { padding: 0; background-color: #fff !important; }
  }
</style>
</head>
<body>
  <div class="ticket">
    <div class="center">
      <h1>${escapeHtml(data.storeName)}</h1>
      <div class="muted">${escapeHtml(documentType)} N° ${data.saleNumber}</div>
      <div class="muted">${dateStr}</div>
      ${
        data.customerName
          ? `<div class="muted">Cliente: ${escapeHtml(data.customerName)}</div>`
          : ""
      }
      <div class="muted">Pago: ${escapeHtml(data.paymentMethod)}</div>
    </div>

    <div class="hr"></div>

    <table>
      <thead class="head"><tr>
        <th class="l name">Producto</th>
        <th class="c qty">Cant</th>
        <th class="r price">Precio</th>
        <th class="r sub">$</th>
      </tr></thead>
      <tbody>
        ${lines || `<tr><td colspan="4" class="c">Sin ítems</td></tr>`}
      </tbody>
      <tfoot>
        <tr><td colspan="4"><div class="hr"></div></td></tr>
        <tr>
          <td class="l total" colspan="3">Total</td>
          <td class="r total">${formatCLP(data.total)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="footer center">
      ¡Gracias por su compra!
    </div>

    <div class="no-print center" style="margin-top:8px;">
      <button onclick="window.print()">Imprimir</button>
      <button onclick="window.close()">Cerrar</button>
    </div>
  </div>

  <script>
    // Inicializar diálogo de impresión manualmente después de cargar
    window.addEventListener('load', function() {
      // Pequeño delay para que el contenido se renderice completamente
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {
          console.warn('Error al abrir diálogo de impresión:', e);
        }
      }, 300);
    });
    
    // Prevenir que la página se quede en negro
    window.addEventListener('afterprint', function() {
      // Intentar cerrar el iframe después de imprimir
      setTimeout(function() {
        if (window.parent !== window) {
          // Estamos en iframe
          try {
            window.parent.postMessage({ type: 'PRINT_COMPLETE' }, '*');
          } catch(e) {}
        }
      }, 500);
    });
  </script>
</body>
</html>
`;
  return html;
}

// --- Resumen de Turno (80mm) ---
export function getShiftSummaryHtml(data: ShiftSummaryData): string {
  const dateStr = data.generatedAt.toLocaleString("es-CL");
  const format = (n: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(n);

  const html = `<!doctype html>
<html><head><meta charset='utf-8'/><title>Resumen Turno</title>
<style>
 @page { size:65mm auto; margin:2mm; }
 * { box-sizing: border-box; margin: 0; padding: 0; }
 html, body { 
   background-color: #fff !important;
   -webkit-print-color-adjust: exact !important;
   print-color-adjust: exact !important;
 }
 body { 
   font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;
   font-size: 11px;
   color: #000;
   line-height: 1.3;
   padding: 2mm;
   -webkit-font-smoothing: antialiased;
 }
 .ticket { width: 100%; max-width: 61mm; margin: 0 auto; background-color: #fff; }
 h1 { font-size: 18px; margin: 0 0 6px; text-align: center; font-weight: 700; letter-spacing: 0.5px; }
 .subtitle { font-size: 14px; font-weight: 600; margin: 4px 0; }
 .center { text-align: center; }
 .r { text-align: right; }
 .l { text-align: left; }
 .hr { border-top: 1px dashed #000; margin: 8px 0; }
 .info { font-size: 11px; margin: 2px 0; }
 table { width: 100%; border-collapse: collapse; }
 table td { padding: 4px 0; font-size: 12px; }
 .total { font-weight: 700; font-size: 14px; }
 .method-row td { font-size: 11px; }
 @media print { .no-print { display: none; } body { background-color: #fff !important; } }
</style></head><body>
 <div class='ticket'>
  <h1>${escapeHtml(data.storeName)}</h1>
  <div class='center subtitle'>RESUMEN DEL TURNO</div>
  <div class='center info'>Generado: ${dateStr}</div>
  <div class='center info'>${escapeHtml(data.windowLabel)}</div>
  <div class='hr'></div>
  <table>
    <tbody>
      <tr><td class='l'>Ventas (cantidad)</td><td class='r'><strong>${
        data.totalSales
      }</strong></td></tr>
      <tr class='total'><td class='l'>Total General</td><td class='r'>${format(
        data.grandTotal
      )}</td></tr>
      <tr><td colspan='2'><div class='hr'></div></td></tr>
      <tr class='method-row'><td class='l'>Efectivo</td><td class='r'>${format(
        data.byMethod.cash
      )}</td></tr>
      <tr class='method-row'><td class='l'>Débito</td><td class='r'>${format(
        data.byMethod.debit
      )}</td></tr>
      <tr class='method-row'><td class='l'>Crédito</td><td class='r'>${format(
        data.byMethod.credit
      )}</td></tr>
      <tr class='method-row'><td class='l'>Transferencia</td><td class='r'>${format(
        data.byMethod.transfer
      )}</td></tr>
    </tbody>
  </table>
  <div class='hr'></div>
  <div class='center info'>Fin del reporte</div>
  <div class='no-print center' style='margin-top:8px;'>
    <button onclick='window.print()'>Imprimir</button>
    <button onclick='window.close()'>Cerrar</button>
  </div>
 </div>
 <script>window.onload=function(){setTimeout(function(){window.print();},100)};</script>
</body></html>`;
  return html;
}

/**
 * Helper genérico para imprimir HTML en un iframe off-screen.
 * Evita pantalla negra usando iframe visible pero posicionado fuera de pantalla.
 * Opcionalmente cambia el título del documento para nombrar el PDF.
 */
function printViaIframe(html: string, pdfTitle?: string) {
  // Limpiar contenedores previos
  document.querySelectorAll('[data-print-container]').forEach(el => {
    el.parentNode?.removeChild(el);
  });

  const printContainer = document.createElement("div");
  printContainer.setAttribute("data-print-container", "true");
  printContainer.style.cssText = `
    position: fixed !important;
    left: -99999px !important;
    top: 0 !important;
    width: 1px !important;
    height: 1px !important;
    overflow: hidden !important;
    pointer-events: none !important;
  `;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = `
    width: 80mm !important;
    height: 297mm !important;
    border: 0 !important;
  `;
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("tabindex", "-1");

  printContainer.appendChild(iframe);
  document.body.appendChild(printContainer);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(printContainer);
    return;
  }

  // Remover auto-print scripts del HTML y agregar solo afterprint listener
  const cleanHtml = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace('</body>', `
    <script>
      window.addEventListener('afterprint', function() {
        setTimeout(function() {
          if (window.parent !== window) {
            try { window.parent.postMessage({ type: 'PRINT_COMPLETE' }, '*'); } catch(e) {}
          }
        }, 300);
      });
    </script>
    </body>`);

  doc.open();
  doc.write(cleanHtml);
  doc.close();

  const cleanup = () => {
    try {
      window.removeEventListener('message', handleMsg);
      requestAnimationFrame(() => {
        document.querySelectorAll('[data-print-container]').forEach(el => {
          el.parentNode?.removeChild(el);
        });
      });
    } catch {}
  };

  const handleMsg = (event: MessageEvent) => {
    if (event.data?.type === 'PRINT_COMPLETE') cleanup();
  };
  window.addEventListener('message', handleMsg);

  const originalTitle = document.title;
  const tryPrint = () => {
    try {
      if (pdfTitle) document.title = pdfTitle;
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => { document.title = originalTitle; }, 1000);
    } catch(e) {
      console.warn('Error al imprimir:', e);
      document.title = originalTitle;
    }
  };

  if (iframe.contentWindow) {
    iframe.contentWindow.addEventListener('load', () => setTimeout(tryPrint, 150));
    setTimeout(tryPrint, 500);
  } else {
    setTimeout(tryPrint, 500);
  }

  setTimeout(() => {
    cleanup();
    if (pdfTitle && document.title === pdfTitle) document.title = originalTitle;
  }, 15000);
}

export function printShiftSummary(data: ShiftSummaryData) {
  const html = getShiftSummaryHtml(data);
  printViaIframe(html, `Resumen_Turno_${data.windowLabel.replace(/[\/\\:*?"<>|]/g, '-')}`);
}

// --- Resumen de Movimientos de Caja (sin ventas) ---
export function getCashMovementsSummaryHtml(
  data: CashMovementsSummaryData
): string {
  const dateStr = data.generatedAt.toLocaleString("es-CL");
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(n);

  // Traducir y ordenar métodos a español
  const labelEs: Record<string, string> = {
    cash: "Efectivo",
    debit: "Débito",
    credit: "Crédito",
    transfer: "Transferencia",
    "-": "-",
  };
  const order = ["cash", "debit", "credit", "transfer", "-"];
  const keys = Array.from(new Set([...order, ...Object.keys(data.byMethod)]));
  const byMethodRows = keys
    .filter((k) => data.byMethod[k])
    .map((k) => {
      const agg = data.byMethod[k];
      const m = labelEs[k] || k;
      return `<tr><td class='l'>${escapeHtml(m)}</td><td class='r'>${fmt(
        agg.inflow
      )}</td><td class='r'>${fmt(agg.outflow)}</td></tr>`;
    })
    .join("");

  const movementRows =
    data.movements.length === 0
      ? `<tr><td class='c' colspan='4'>Sin movimientos</td></tr>`
      : data.movements
          .map((m) => {
            const amt = fmt(Math.abs(m.amount));
            const sign = m.amount < 0 ? "-" : "+";
            return `<tr class='row'>
              <td class='l'>${escapeHtml(m.date)}</td>
              <td class='l'>${escapeHtml(m.type)}</td>
              <td class='l'>${escapeHtml(m.method)}</td>
              <td class='r'>${sign}${amt}</td>
            </tr>`;
          })
          .join("");

  const html = `<!doctype html>
<html><head><meta charset='utf-8'/><title>Movimientos de Caja</title>
<style>
 @page { size:65mm auto; margin:2mm; }
 * { box-sizing: border-box; margin: 0; padding: 0; }
 html, body { 
   background-color: #fff !important;
   -webkit-print-color-adjust: exact !important;
   print-color-adjust: exact !important;
 }
 body { 
   font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;
   font-size: 10px;
   color: #000;
   line-height: 1.3;
   padding: 2mm;
   -webkit-font-smoothing: antialiased;
 }
 .ticket { width: 100%; max-width: 61mm; margin: 0 auto; background-color: #fff; }
 h1 { font-size: 18px; margin: 0 0 6px; text-align: center; font-weight: 700; letter-spacing: 0.5px; }
 .subtitle { font-size: 13px; font-weight: 600; margin: 4px 0; }
 .center { text-align: center; }
 .r { text-align: right; }
 .l { text-align: left; }
 .c { text-align: center; }
 .hr { border-top: 1px dashed #000; margin: 8px 0; }
 .info { font-size: 10px; margin: 2px 0; }
 table { width: 100%; border-collapse: collapse; }
 table td, table th { padding: 3px 2px; font-size: 11px; }
 .total { font-weight: 700; font-size: 12px; }
 .row td { vertical-align: top; font-size: 10px; }
 thead th { font-weight: 600; font-size: 10px; border-bottom: 1px solid #000; }
 @media print { .no-print { display: none; } body { background-color: #fff !important; } }
</style></head><body>
 <div class='ticket'>
  <h1>${escapeHtml(data.storeName)}</h1>
  <div class='center subtitle'>MOVIMIENTOS DE CAJA</div>
  <div class='center info'>Generado: ${dateStr}</div>
  <div class='center info'>${escapeHtml(data.windowLabel)}</div>
  <div class='hr'></div>
  <table>
    <tbody>
      <tr><td class='l'>Apertura</td><td class='r' colspan='3'>${fmt(
        data.openingAmount
      )}</td></tr>
      <tr class='total'><td class='l'>Ingresos</td><td class='r' colspan='3'>${fmt(
        data.inflow
      )}</td></tr>
      <tr class='total'><td class='l'>Egresos</td><td class='r' colspan='3'>${fmt(
        data.outflow
      )}</td></tr>
      <tr class='total'><td class='l'>Neto mov.</td><td class='r' colspan='3'>${fmt(
        data.net
      )}</td></tr>
      ${
        typeof data.closingBalance === "number"
          ? `<tr class='total'><td class='l'>Saldo final</td><td class='r' colspan='3'>${fmt(
              data.closingBalance
            )}</td></tr>`
          : ""
      }
    </tbody>
  </table>
  <div class='hr'></div>
  <div class='center subtitle' style='font-size:11px;'>Por método</div>
  <table>
    <thead><tr><th class='l'>Método</th><th class='r'>Ingresos</th><th class='r'>Egresos</th></tr></thead>
    <tbody>${
      byMethodRows || `<tr><td colspan='3' class='c'>-</td></tr>`
    }</tbody>
  </table>
  <div class='hr'></div>
  <div class='center subtitle' style='font-size:11px;'>Detalle</div>
  <table>
    <thead><tr><th class='l'>Fecha</th><th class='l'>Tipo</th><th class='l'>Mét.</th><th class='r'>Monto</th></tr></thead>
    <tbody>${movementRows}</tbody>
  </table>
  <div class='hr'></div>
  <div class='center info'>Fin del reporte</div>
  <div class='no-print center' style='margin-top:8px;'>
    <button onclick='window.print()'>Imprimir</button>
    <button onclick='window.close()'>Cerrar</button>
  </div>
 </div>
 <script>window.onload=function(){setTimeout(function(){window.print();},100)};</script>
</body></html>`;
  return html;
}

export function printCashMovementsSummary(data: CashMovementsSummaryData) {
  const html = getCashMovementsSummaryHtml(data);
  printViaIframe(html, `Movimientos_Caja_${data.windowLabel.replace(/[\/\\:*?"<>|]/g, '-')}`);
}
