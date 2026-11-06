import type { Freshness } from "../types";

const SEOUL = "Asia/Seoul";

export function seoulToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function diffDays(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

export function freshnessOf(expirationDate: string | null, today = seoulToday()): Freshness {
  if (!expirationDate) return "UNKNOWN";
  const daysLeft = diffDays(today, expirationDate);
  if (daysLeft < 0) return "EXPIRED";
  if (daysLeft <= 3) return "EXPIRING";
  return "FRESH";
}

export function daysLeftOf(expirationDate: string | null, today = seoulToday()): number | null {
  if (!expirationDate) return null;
  return diffDays(today, expirationDate);
}
