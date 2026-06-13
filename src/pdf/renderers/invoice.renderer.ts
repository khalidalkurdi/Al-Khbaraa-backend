import type { PdfDocument } from '../pdf.types';
import {
  drawFooter,
  drawKeyValue,
  drawSectionTitle,
  drawTable,
  drawText,
} from './helpers';
import type { InvoicePdfData, PdfBranding } from '../pdf.types';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  toFixed2,
} from '../text/formatting';

export function renderInvoicePdf(
  document: PdfDocument,
  data: InvoicePdfData,
  branding: PdfBranding,
): void {
  document.info.Title = `Invoice ${data.invoiceNumber}`;
  document.info.Subject = 'Customer invoice';

  let y = document.page.margins.top;

  document.fontSize(18).fillColor('#111827').font('Helvetica-Bold');
  document.text('Invoice', document.page.margins.left, y);
  y = document.y + 18;

  if (branding.logoPath) {
    try {
      document.image(branding.logoPath, document.page.margins.left, y, {
        width: 90,
        height: 60,
      });
    } catch {
      y = drawText(
        document,
        branding.centerName,
        document.page.margins.left,
        y,
        {
          fontSize: 16,
          bold: true,
          height: 8,
        },
      );
    }
  } else {
    y = drawText(document, branding.centerName, document.page.margins.left, y, {
      fontSize: 16,
      bold: true,
      height: 8,
    });
  }

  y = Math.max(y, document.page.margins.top + 72);
  y = drawText(
    document,
    branding.secondaryName,
    document.page.margins.left + 110,
    document.page.margins.top,
    {
      fontSize: 10,
      bold: true,
      height: 6,
    },
  );
  y = drawText(
    document,
    branding.address,
    document.page.margins.left + 110,
    y,
    {
      fontSize: 9,
      height: 5,
    },
  );
  y = drawText(
    document,
    `${branding.phone1}${branding.phone2 ? ` • ${branding.phone2}` : ''}`,
    document.page.margins.left + 110,
    y,
    {
      fontSize: 9,
      height: 5,
    },
  );
  y = drawText(document, branding.email, document.page.margins.left + 110, y, {
    fontSize: 9,
    height: 12,
  });

  y = drawSectionTitle(document, 'Invoice Details', y);
  y = drawKeyValue(document, 'Invoice Number:', data.invoiceNumber, y);
  y = drawKeyValue(document, 'Request Number:', data.requestNumber, y);
  y = drawKeyValue(
    document,
    'Invoice Date:',
    formatDateTime(data.createdAt),
    y,
  );
  y = drawKeyValue(document, 'Customer:', data.customer.name, y);
  y = drawKeyValue(
    document,
    'Customer Phone:',
    data.customer.firstPhone ?? 'Not provided',
    y,
  );
  if (data.technician) {
    y = drawKeyValue(document, 'Technician:', data.technician.fullName, y);
  }

  y = drawSectionTitle(document, 'Itemized Services and Parts', y);
  y = drawTable(
    document,
    [
      {
        header: 'Item',
        width: 180,
        render: (row) => row.sparePartName ?? row.sparePartId,
      },
      {
        header: 'Qty',
        width: 45,
        align: 'center',
        render: (row) => String(row.quantity),
      },
      {
        header: 'Unit Price',
        width: 90,
        align: 'right',
        render: (row) => formatCurrency(row.unitPrice, row.currency),
      },
      {
        header: 'Total',
        width: 90,
        align: 'right',
        render: (row) => formatCurrency(row.totalPrice, row.currency),
      },
    ],
    data.items,
    y,
  );

  y = drawSectionTitle(document, 'Payment Summary', y);
  y = drawKeyValue(
    document,
    'Subtotal:',
    formatCurrency(data.totalAmount, data.totalCurrency),
    y,
    150,
  );
  y = drawKeyValue(
    document,
    'Paid Amount:',
    formatCurrency(data.paidAmount, data.totalCurrency),
    y,
    150,
  );
  y = drawKeyValue(
    document,
    'Remaining Balance:',
    formatCurrency(data.remainingAmount, data.totalCurrency),
    y,
    150,
  );

  y = drawSectionTitle(document, 'Payment History', y);
  y = drawTable(
    document,
    [
      { header: 'Date', width: 110, render: (row) => formatDate(row.paidAt) },
      { header: 'Method', width: 110, render: (row) => row.paymentMethod },
      {
        header: 'Amount',
        width: 100,
        align: 'right',
        render: (row) => formatCurrency(row.amount, row.currency),
      },
      {
        header: 'Converted',
        width: 100,
        align: 'right',
        render: (row) => toFixed2(row.convertedAmount),
      },
    ],
    data.payments,
    y,
  );

  if (data.warrantyPeriod || data.needsCenterMaintenance || data.notes) {
    y = drawSectionTitle(document, 'Terms and Notes', y);
    if (data.warrantyPeriod) {
      y = drawText(
        document,
        `Warranty: ${data.warrantyPeriod}`,
        document.page.margins.left,
        y,
        {
          fontSize: 9,
          height: 6,
        },
      );
    }
    if (data.needsCenterMaintenance) {
      y = drawText(
        document,
        `Center maintenance: ${data.needsCenterMaintenance}`,
        document.page.margins.left,
        y,
        {
          fontSize: 9,
          height: 6,
        },
      );
    }
    if (data.notes) {
      y = drawText(
        document,
        `Notes: ${data.notes}`,
        document.page.margins.left,
        y,
        {
          fontSize: 9,
          height: 6,
        },
      );
    }
  }

  document.on('pageAdded', () =>
    drawFooter(
      document,
      branding.terms,
      document.bufferedPageRange().start + 1,
    ),
  );
  drawFooter(document, branding.terms, document.bufferedPageRange().start + 1);
}
