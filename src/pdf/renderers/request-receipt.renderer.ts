import type { PdfDocument } from '../pdf.types';
import { drawFooter, drawKeyValue, drawSectionTitle, drawTable, drawText } from './helpers';
import type { PdfBranding, RequestReceiptPdfData } from '../pdf.types';
import { formatDate, formatDateTime } from '../text/formatting';

export function renderRequestReceiptPdf(document: PdfDocument, data: RequestReceiptPdfData, branding: PdfBranding): void {
  document.info.Title = `Request Receipt ${data.requestNumber}`;
  document.info.Subject = 'Repair request receipt';

  let y = document.page.margins.top;

  document.fontSize(18).fillColor('#111827').font('Helvetica-Bold');
  document.text('Request Receipt', document.page.margins.left, y);
  y = document.y + 18;

  if (branding.logoPath) {
    try {
      document.image(branding.logoPath, document.page.margins.left, y, { width: 90, height: 60 });
    } catch {
      y = drawText(document, branding.centerName, document.page.margins.left, y, {
        fontSize: 16,
        bold: true,
        height: 8,
      });
    }
  } else {
    y = drawText(document, branding.centerName, document.page.margins.left, y, {
      fontSize: 16,
      bold: true,
      height: 8,
    });
  }

  y = Math.max(y, document.page.margins.top + 72);
  y = drawText(document, branding.secondaryName, document.page.margins.left + 110, document.page.margins.top, {
    fontSize: 10,
    bold: true,
    height: 6,
  });
  y = drawText(document, branding.address, document.page.margins.left + 110, y, {
    fontSize: 9,
    height: 5,
  });
  y = drawText(document, `${branding.phone1}${branding.phone2 ? ` • ${branding.phone2}` : ''}`, document.page.margins.left + 110, y, {
    fontSize: 9,
    height: 5,
  });
  y = drawText(document, branding.email, document.page.margins.left + 110, y, {
    fontSize: 9,
    height: 12,
  });

  y = drawSectionTitle(document, 'Receipt Details', y);
  y = drawKeyValue(document, 'REQ-code:', data.requestNumber, y);
  y = drawKeyValue(document, 'Request Date:', formatDateTime(data.createdAt), y);
  y = drawKeyValue(document, 'Scheduled Date:', formatDate(data.scheduledDate), y);
  if (data.scheduledTime) {
    y = drawKeyValue(document, 'Scheduled Time:', new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(data.scheduledTime), y);
  }
  y = drawKeyValue(document, 'Priority:', data.priority, y);
  y = drawKeyValue(document, 'Status:', data.status, y);
  y = drawKeyValue(document, 'Customer:', data.customer.name, y);
  y = drawKeyValue(document, 'Customer Phone:', data.customer.firstPhone ?? 'Not provided', y);
  if (data.creator) {
    y = drawKeyValue(document, 'Created By:', data.creator.fullName, y);
  }

  y = drawSectionTitle(document, 'Device Descriptions', y);
  y = drawTable(
    document,
    [
      { header: 'Type', width: 120, render: (row) => row.deviceType },
      { header: 'Name', width: 150, render: (row) => row.deviceName },
      { header: 'Brand', width: 100, render: (row) => row.brand ?? '' },
      { header: 'Model', width: 100, render: (row) => row.model ?? '' },
    ],
    data.devices,
    y,
  );

  y = drawSectionTitle(document, 'Fault Description', y);
  y = drawText(document, data.faultDescription, document.page.margins.left, y, {
    fontSize: 9,
    height: 6,
  });

  if (data.notes) {
    y = drawSectionTitle(document, 'Notes', y);
    y = drawText(document, data.notes, document.page.margins.left, y, {
      fontSize: 9,
      height: 6,
    });
  }

  document.on('pageAdded', () => drawFooter(document, branding.terms, document.bufferedPageRange().start + 1));
  drawFooter(document, branding.terms, document.bufferedPageRange().start + 1);
}
