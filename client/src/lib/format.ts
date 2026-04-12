/**
 * Shared number formatting utilities for BEES Fuel Station
 * All monetary KPI cards use: compact primary + full Indian-format secondary
 */

/** Full Indian-locale currency string: ₹1,00,03,078.05 */
export function fmtFull(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

/** Compact display: ₹1.00Cr / ₹26.86L / ₹4.2K / ₹500 */
export function fmtCompact(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

/** Volume: 493.8KL / 26.6KL / 850L */
export function fmtVol(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}KL`;
  return `${n.toFixed(0)}L`;
}

/** Full volume with Indian grouping and 2 decimals: 2,71,051.35 L */
export function fmtVolFull(n: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n) + " L";
}

/** Plain integer with Indian grouping: 1,00,000 */
export function fmtInt(n: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.round(n));
}

/** Full currency with zero decimals for table cells */
export function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}
