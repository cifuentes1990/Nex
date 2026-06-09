'use client';

import { Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useSession } from 'next-auth/react';
import dayjs from 'dayjs';

interface PrintReceiptProps {
  order: any;
}

export function PrintReceipt({ order }: PrintReceiptProps) {
  const { data: session } = useSession();

  const handlePrint = () => {
    const orgName = (session as any)?.organization?.name ?? 'Mi Negocio';
    const date    = dayjs(order.createdAt ?? new Date()).format('DD/MM/YYYY HH:mm');

    const items = (order.items ?? [])
      .map((i: any) => {
        const name  = i.name ?? i.product?.name ?? 'Producto';
        const qty   = i.quantity;
        const total = formatCurrency(i.total ?? i.unitPrice * i.quantity);
        // Truncar nombre a 22 chars para que quepa en 80mm
        const shortName = name.length > 22 ? name.substring(0, 20) + '..' : name;
        return `<tr>
          <td style="padding:1px 0;width:60%">${qty}x ${shortName}</td>
          <td style="text-align:right;padding:1px 0;width:40%">${total}</td>
        </tr>`;
      })
      .join('');

    const paymentRow = order.payments?.[0]?.method
      ? `<tr><td>Pago</td><td style="text-align:right">${order.payments[0].method}</td></tr>`
      : '';

    const changeRow = (order.changeAmount ?? 0) > 0
      ? `<tr><td>Cambio</td><td style="text-align:right">${formatCurrency(order.changeAmount)}</td></tr>`
      : '';

    const discountRow = (order.discountAmount ?? 0) > 0
      ? `<tr><td>Descuento</td><td style="text-align:right">-${formatCurrency(order.discountAmount)}</td></tr>`
      : '';

    const shippingRow = (order.shippingCost ?? 0) > 0
      ? `<tr><td>Envío</td><td style="text-align:right">${formatCurrency(order.shippingCost)}</td></tr>`
      : '';

    const customerRow = order.customer
      ? `<div style="margin:2px 0">
          Cliente: ${order.customer.firstName} ${order.customer.lastName ?? ''}
         </div>`
      : '';

    const html = `
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { margin: 0; size: 80mm auto; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            color: #000;
            width: 76mm;
            padding: 3mm 2mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .large { font-size: 14px; }
          .separator { border-top: 1px dashed #000; margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; }
          td { vertical-align: top; }
          .total-row td { font-weight: bold; font-size: 13px; padding-top: 2px; }
          .footer { text-align: center; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="bold large">${orgName}</div>
          <div>${date}</div>
          <div class="bold">${order.number}</div>
          ${customerRow}
        </div>

        <div class="separator"></div>

        <table>
          <tbody>${items}</tbody>
        </table>

        <div class="separator"></div>

        <table>
          <tr>
            <td>Subtotal</td>
            <td style="text-align:right">${formatCurrency(order.subtotal ?? 0)}</td>
          </tr>
          ${discountRow}
          <tr>
            <td>IVA (19%)</td>
            <td style="text-align:right">${formatCurrency(order.taxAmount ?? 0)}</td>
          </tr>
          ${shippingRow}
          <tr class="total-row">
            <td>TOTAL</td>
            <td style="text-align:right">${formatCurrency(order.total)}</td>
          </tr>
          ${paymentRow}
          ${changeRow}
        </table>

        <div class="separator"></div>

        <div class="footer">
          ¡Gracias por su compra!<br>
          Vuelva pronto 😊
        </div>
      </body>
      </html>
    `;

    // Abrir ventana de impresión con el recibo
    const win = window.open('', '_blank', 'width=350,height=600');
    if (!win) {
      alert('Activa las ventanas emergentes para imprimir el ticket.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    // Dar tiempo al navegador para renderizar antes de imprimir
    setTimeout(() => {
      win.print();
      win.close();
    }, 300);
  };

  return (
    <button
      onClick={handlePrint}
      className="flex items-center justify-center gap-2 w-full h-9 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:border-nexus-500/50 hover:text-nexus-500 text-xs font-medium transition-colors"
    >
      <Printer className="h-3.5 w-3.5" />
      Imprimir ticket
    </button>
  );
}
