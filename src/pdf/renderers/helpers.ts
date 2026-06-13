import type { PdfDocument } from '../pdf.types';
import { shapeArabicText } from '../text/formatting';

export interface TableColumn<T> {
  header: string;
  width: number;
  render: (row: T) => string;
  align?: 'left' | 'center' | 'right';
}

export function drawText(
  document: PdfDocument,
  text: string,
  x: number,
  y: number,
  options: {
    width?: number;
    align?: 'left' | 'center' | 'right';
    fontSize?: number;
    bold?: boolean;
    color?: string;
    height?: number;
  } = {},
): number {
  document
    .fontSize(options.fontSize ?? 10)
    .fillColor(options.color ?? '#111827')
    .font(options.bold ? 'Helvetica-Bold' : 'Helvetica');

  document.text(shapeArabicText(text), x, y, {
    width: options.width,
    align: options.align ?? 'left',
    lineBreak: true,
  });

  return document.y + (options.height ?? 6);
}

export function drawSectionTitle(
  document: PdfDocument,
  title: string,
  y: number,
): number {
  document.moveDown();
  return drawText(document, title, document.page.margins.left, document.y, {
    fontSize: 13,
    bold: true,
    color: '#1f2937',
    height: 8,
  });
}

export function drawTable<T>(
  document: PdfDocument,
  columns: TableColumn<T>[],
  rows: T[],
  y: number,
): number {
  const left = document.page.margins.left;
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const rowHeight = 24;
  const headerHeight = 26;

  const drawHeader = () => {
    let x = left;
    document
      .fillColor('#1f2937')
      .rect(left, y, totalWidth, headerHeight)
      .fill();
    document.fillColor('#ffffff');

    for (const column of columns) {
      document
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(shapeArabicText(column.header), x + 4, y + 7, {
          width: column.width - 8,
          align: column.align ?? 'left',
        });
      x += column.width;
    }

    document
      .strokeColor('#d1d5db')
      .rect(left, y, totalWidth, headerHeight)
      .stroke();
  };

  const drawRow = (row: T, index: number) => {
    if (
      document.y + rowHeight >
      document.page.height - document.page.margins.bottom
    ) {
      document.addPage();
      y = document.page.margins.top;
      drawHeader();
      document.y = y + headerHeight;
    }

    let x = left;
    const rowY = document.y;

    document
      .fillColor(index % 2 === 0 ? '#ffffff' : '#f9fafb')
      .rect(left, rowY, totalWidth, rowHeight)
      .fill();
    document.fillColor('#111827');

    for (const column of columns) {
      document
        .fontSize(8.5)
        .font('Helvetica')
        .text(shapeArabicText(column.render(row)), x + 4, rowY + 6, {
          width: column.width - 8,
          align: column.align ?? 'left',
        });
      x += column.width;
    }

    document
      .strokeColor('#e5e7eb')
      .rect(left, rowY, totalWidth, rowHeight)
      .stroke();
    document.y = rowY + rowHeight;
  };

  drawHeader();
  document.y = y + headerHeight;

  for (const [index, row] of rows.entries()) {
    drawRow(row, index);
  }

  return document.y + 10;
}

export function drawKeyValue(
  document: PdfDocument,
  label: string,
  value: string,
  y: number,
  labelWidth = 150,
): number {
  document.fontSize(9).fillColor('#4b5563').font('Helvetica-Bold');
  document.text(shapeArabicText(label), document.page.margins.left, y, {
    width: labelWidth,
  });

  document.fontSize(9).fillColor('#111827').font('Helvetica');
  document.text(
    shapeArabicText(value),
    document.page.margins.left + labelWidth,
    y,
    {
      width:
        document.page.width -
        document.page.margins.left -
        document.page.margins.right -
        labelWidth,
    },
  );

  return document.y + 4;
}

export function drawFooter(
  document: PdfDocument,
  terms: string[],
  pageNumber: number,
): void {
  const y = document.page.height - 38;
  document.fontSize(7).fillColor('#6b7280').font('Helvetica');
  document.text(`Page ${pageNumber}`, document.page.margins.left, y, {
    width: 120,
  });

  const termsText = terms.filter(Boolean).join(' • ');
  document.text(
    shapeArabicText(termsText || 'No terms configured'),
    document.page.margins.left + 130,
    y,
    {
      width:
        document.page.width -
        document.page.margins.left -
        document.page.margins.right -
        130,
      align: 'right',
    },
  );
}
