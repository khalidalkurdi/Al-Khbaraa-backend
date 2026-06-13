import reshapeArabicText from 'arabic-reshaper';
import bidi from 'bidi-js';

const ARABIC_PATTERN =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function containsArabicText(value: string): boolean {
  return ARABIC_PATTERN.test(value);
}

export function shapeArabicText(value: string): string {
  if (!containsArabicText(value)) {
    return value;
  }

  const reshaped = reshapeArabicText.convertArabic(value);
  return bidi.getReorderedString(reshaped);
}

export function formatCurrency(
  value: number | string,
  currency = 'SYP',
): string {
  const numericValue = typeof value === 'number' ? value : Number(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

export function formatDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

export function formatDateTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function toFixed2(value: number | string | null | undefined): string {
  return toNumber(value).toFixed(2);
}
