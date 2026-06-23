/** Format an ILS amount, e.g. ₪36,826.60. */
export function ils(value: number): string {
  return `₪${num(value)}`;
}

/** Format a USD amount, e.g. $635.25. */
export function usd(value: number): string {
  return `$${num(value)}`;
}

/** Format a value in the chosen currency. */
export function money(value: number, currency: "ILS" | "USD"): string {
  return currency === "USD" ? usd(value) : ils(value);
}

/** Two-decimal grouped number. */
export function num(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Percentage, e.g. 46.08%. */
export function pct(fraction: number, decimals = 2): string {
  return `${(fraction * 100).toFixed(decimals)}%`;
}

/** Today's date as YYYY-MM-DD for date inputs. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
