import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Local YYYY-MM-DD (avoids UTC off-by-one from toISOString). */
export function todayISO(d: Date = new Date()): string {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function round(n: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

/** Percentage of a target, clamped 0..100 for progress bars. */
export function pct(value: number, target: number): number {
  if (!target) return 0;
  return clamp(Math.round((value / target) * 100), 0, 100);
}
