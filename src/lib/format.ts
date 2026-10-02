export const TIMEZONE = "Europe/Moscow";

const rub = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

/** 12 345 678 ₽ */
export function formatRub(value: number): string {
  return `${rub.format(Math.round(value))} ₽`;
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits }).format(value);
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${formatNumber(value * 100, digits)}%`;
}

export function formatDate(date: Date | string, withTime = false): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

export function formatDateLong(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TIMEZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** plural(5, ["этаж", "этажа", "этажей"]) → "этажей" */
export function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024)} КБ`;
  return `${formatNumber(bytes / 1024 / 1024, 1)} МБ`;
}

export function leadNumber(id: number): string {
  return `VR-${String(id).padStart(5, "0")}`;
}
