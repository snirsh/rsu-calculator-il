/** Format an ILS amount, e.g. ₪12,345.67. */
export function ils(value: number): string {
  return `₪${num(value)}`;
}

/** Format a USD amount, e.g. $1,234.56. */
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

/** Percentage, e.g. 23.50%. */
export function pct(fraction: number, decimals = 2): string {
  return `${(fraction * 100).toFixed(decimals)}%`;
}

/** Today's date as YYYY-MM-DD for date inputs. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * A colour key shared by the breakdown bar, its legend, and the statement rows.
 * "pos"/"neg" are sign tones; the rest name a breakdown category.
 */
export type Tone =
  | "pos"
  | "neg"
  | "net"
  | "income"
  | "bituah"
  | "capital"
  | "invest"
  | "fees";

/** Sign-based tone for a signed figure: a gain/credit (+), a loss/owed (−), or none. */
export function signTone(value: number): "pos" | "neg" | undefined {
  return value > 0 ? "pos" : value < 0 ? "neg" : undefined;
}
