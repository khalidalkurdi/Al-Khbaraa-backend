import type { PdfDocument } from '../pdf.types';
import {
  drawFooter,
  drawKeyValue,
  drawSectionTitle,
  drawTable,
  drawText,
} from './helpers';
import type { FinancialReportPdfData, PdfBranding } from '../pdf.types';
import {
  formatSyriaDate,
  getSyriaNow,
} from '../../common/utils/syria-date.util';

export function renderFinancialReportPdf(
  document: PdfDocument,
  data: FinancialReportPdfData,
  branding: PdfBranding,
): void {
  document.info.Title = `Financial Report ${data.periodStart} - ${data.periodEnd}`;
  document.info.Subject = 'Manager financial report';

  let y = document.page.margins.top;

  document.fontSize(18).fillColor('#111827').font('Helvetica-Bold');
  document.text('Financial Report', document.page.margins.left, y);
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

  y = drawSectionTitle(document, 'Report Summary', y);
  y = drawKeyValue(
    document,
    'Period:',
    `${data.periodStart} to ${data.periodEnd}`,
    y,
  );
  y = drawKeyValue(
    document,
    'Generated:',
    formatSyriaDate(getSyriaNow(), 'yyyy-MM-dd HH:mm'),
    y,
  );
  y = drawKeyValue(document, 'Currency:', 'SYP', y);

  y = drawSectionTitle(document, 'Financial Totals', y);
  y = drawTable(
    document,
    [
      { header: 'Metric', width: 220, render: (row) => row.label },
      {
        header: 'Amount (SYP)',
        width: 180,
        align: 'right',
        render: (row) => row.amount,
      },
    ],
    [
      { label: 'Total Revenues', amount: data.totalRevenues },
      { label: 'Fixed Costs', amount: data.fixedCosts },
      { label: 'Variable Costs', amount: data.variableCosts },
      { label: 'Parts Costs', amount: data.partsCosts },
      { label: 'Other Costs', amount: data.otherCosts },
      { label: 'Net Profit', amount: data.netProfit },
    ],
    y,
  );

  y = drawSectionTitle(document, 'Assumptions', y);
  for (const assumption of data.assumptions) {
    y = drawText(document, `• ${assumption}`, document.page.margins.left, y, {
      fontSize: 9,
      height: 6,
    });
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
