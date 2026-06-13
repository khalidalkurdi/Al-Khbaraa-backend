import PDFDocument from 'pdfkit';

export type PdfDocument = InstanceType<typeof PDFDocument>;

export type PdfDocumentType =
  | 'invoice'
  | 'request_receipt'
  | 'financial_report';

export interface PdfBranding {
  centerName: string;
  secondaryName: string;
  address: string;
  phone1: string;
  phone2?: string;
  email: string;
  logoPath?: string;
  terms: string[];
  dollarExchangeRate?: string;
}

export interface PdfCustomer {
  id: string;
  name: string;
  firstPhone?: string;
  secondPhone?: string;
  address?: string;
}

export interface PdfUser {
  id: string;
  fullName: string;
  email?: string;
}

export interface InvoicePdfLineItem {
  id: string;
  sparePartId: string;
  sparePartName?: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  totalPrice: number;
  notes?: string;
}

export interface InvoicePdfPayment {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  dollarExchangeRate?: number;
  convertedAmount?: number;
  paidAt: Date;
  notes?: string;
}

export interface InvoicePdfData {
  id: string;
  invoiceNumber: string;
  requestId: string;
  requestNumber: string;
  createdAt: Date;
  customer: PdfCustomer;
  technician?: PdfUser;
  items: InvoicePdfLineItem[];
  payments: InvoicePdfPayment[];
  totalAmount: number;
  totalCurrency: string;
  paidAmount: number;
  remainingAmount: number;
  warrantyPeriod?: string;
  needsCenterMaintenance?: string;
  notes?: string;
}

export interface RequestReceiptPdfDevice {
  id: string;
  deviceType: string;
  deviceName: string;
  brand?: string;
  model?: string;
}

export interface RequestReceiptPdfData {
  id: string;
  requestNumber: string;
  createdAt: Date;
  scheduledDate: Date;
  scheduledTime?: Date | null;
  priority: string;
  status: string;
  customer: PdfCustomer;
  creator?: PdfUser;
  devices: RequestReceiptPdfDevice[];
  faultDescription: string;
  notes?: string;
}

export interface FinancialReportPdfData {
  periodStart: string;
  periodEnd: string;
  totalRevenues: string;
  fixedCosts: string;
  variableCosts: string;
  partsCosts: string;
  otherCosts: string;
  netProfit: string;
  assumptions: string[];
}

export interface PdfRenderOptions {
  documentType: PdfDocumentType;
  filename: string;
  locale?: string;
  direction?: 'ltr' | 'rtl';
}

export interface PdfRenderResult {
  filename: string;
  buffer: Buffer;
  contentType: 'application/pdf';
}

export type PdfRenderer<T> = (
  document: PdfDocument,
  data: T,
) => void | Promise<void>;
