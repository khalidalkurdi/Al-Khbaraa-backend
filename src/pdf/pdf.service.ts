import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import PDFDocument from 'pdfkit';
import { SettingsService } from '../settings/settings.service';
import type { PdfDocument } from './pdf.types';
import { renderFinancialReportPdf } from './renderers/financial-report.renderer';
import { renderInvoicePdf } from './renderers/invoice.renderer';
import { renderRequestReceiptPdf } from './renderers/request-receipt.renderer';
import type {
  FinancialReportPdfData,
  InvoicePdfData,
  PdfBranding,
  PdfRenderOptions,
  PdfRenderResult,
  RequestReceiptPdfData,
} from './pdf.types';
import { pdfFilename } from './utils/filename';

interface CenterSettingsLike {
  centerName?: string;
  secondaryName?: string;
  address?: string;
  phone1?: string;
  phone2?: string;
  email?: string;
  logoPath?: string;
  term1?: string;
  term2?: string;
  term3?: string;
  term4?: string;
  dollarExchangeRate?: unknown;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(private readonly settingsService: SettingsService) {}

  async generateInvoicePdf(data: InvoicePdfData, options: PdfRenderOptions): Promise<PdfRenderResult> {
    const branding = await this.resolveBranding();
    const buffer = await this.render((document) => renderInvoicePdf(document, data, branding));

    return {
      filename: pdfFilename(options.filename || `invoice-${data.invoiceNumber}`),
      buffer,
      contentType: 'application/pdf',
    };
  }

  async generateRequestReceiptPdf(data: RequestReceiptPdfData, options: PdfRenderOptions): Promise<PdfRenderResult> {
    const branding = await this.resolveBranding();
    const buffer = await this.render((document) => renderRequestReceiptPdf(document, data, branding));

    return {
      filename: pdfFilename(options.filename || `request-${data.requestNumber}`),
      buffer,
      contentType: 'application/pdf',
    };
  }

  async generateFinancialReportPdf(data: FinancialReportPdfData, options: PdfRenderOptions): Promise<PdfRenderResult> {
    const branding = await this.resolveBranding();
    const buffer = await this.render((document) => renderFinancialReportPdf(document, data, branding));

    return {
      filename: pdfFilename(options.filename || `financial-report-${data.periodStart}`),
      buffer,
      contentType: 'application/pdf',
    };
  }

  async resolveBranding(): Promise<PdfBranding> {
    let settings: CenterSettingsLike | null = null;

    try {
      settings = (await this.settingsService.getSettings()) as CenterSettingsLike;
    } catch (error) {
      this.logger.warn(`Center settings not found; using PDF branding fallback: ${error instanceof Error ? error.message : String(error)}`);
    }

    const logoPath = settings?.logoPath ? this.resolveLogoPath(settings.logoPath) : undefined;
    const terms = [settings?.term1, settings?.term2, settings?.term3, settings?.term4].filter((term): term is string => Boolean(term));

    return {
      centerName: settings?.centerName || 'Al-Khbaraa Center',
      secondaryName: settings?.secondaryName || 'Repair Center Management',
      address: settings?.address || 'Address not configured',
      phone1: settings?.phone1 || 'Phone not configured',
      phone2: settings?.phone2,
      email: settings?.email || 'Email not configured',
      logoPath,
      terms,
      dollarExchangeRate: settings?.dollarExchangeRate ? String(settings.dollarExchangeRate) : undefined,
    };
  }

  private resolveLogoPath(logoPath: string): string | undefined {
    if (!logoPath || logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
      return undefined;
    }

    const normalized = logoPath.replace(/^[\\/]+/, '');
    const absolutePath = path.isAbsolute(normalized) ? normalized : path.join(process.cwd(), normalized);

    return fs.existsSync(absolutePath) ? absolutePath : undefined;
  }

  private async render(render: (document: PdfDocument) => void): Promise<Buffer> {
    const document = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true,
      compress: true,
    });
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);

      try {
        render(document);
        document.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
