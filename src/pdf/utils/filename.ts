export function sanitizePdfFilename(filename: string): string {
  const sanitized = filename
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return sanitized || 'document';
}

export function pdfFilename(filename: string): string {
  const sanitized = sanitizePdfFilename(filename);
  return sanitized.endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
}
