const SYRIA_TIMEZONE_OFFSET = 3 * 60; // +03:00 in minutes

export function getSyriaNow(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (SYRIA_TIMEZONE_OFFSET * 60000));
}

export function toSyriaDate(date: Date | string): Date {
  const d = new Date(date);
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (SYRIA_TIMEZONE_OFFSET * 60000));
}

export function formatSyriaDate(
  date: Date | string,
  format: string = 'yyyy-MM-dd HH:mm:ss',
): string {
  const d = toSyriaDate(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}