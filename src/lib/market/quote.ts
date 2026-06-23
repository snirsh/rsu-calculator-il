import { fetchJsonWithFallback } from "./http";

export interface Quote {
  symbol: string;
  price: number;
  currency: string;
  /** True for Tel-Aviv (.TA) listings, which are priced in ILS (agorot→ILS). */
  isTase: boolean;
}

interface YahooChart {
  chart?: {
    result?: {
      meta?: {
        regularMarketPrice?: number;
        currency?: string;
        symbol?: string;
      };
      timestamp?: number[];
      indicators?: { quote?: { close?: (number | null)[] }[] };
    }[];
  };
}

function isTaseSymbol(symbol: string): boolean {
  return symbol.toUpperCase().endsWith(".TA");
}

/**
 * Yahoo Finance reports TASE prices in agorot (1/100 ILS). Convert to ILS.
 */
function normalizePrice(price: number, currency: string | undefined): number {
  if (currency === "ILA") return price / 100;
  return price;
}

/** Latest price for a symbol, or null if unavailable (user can override). */
export async function fetchQuote(symbol: string): Promise<Quote | null> {
  const data = await fetchJsonWithFallback<YahooChart>(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol,
    )}?range=1d&interval=1d`,
  );
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) return null;
  return {
    symbol: meta.symbol ?? symbol,
    price: normalizePrice(meta.regularMarketPrice, meta.currency),
    currency: meta.currency ?? "USD",
    isTase: isTaseSymbol(symbol),
  };
}

/**
 * Average closing price over the ~30 trading days before a grant date — the
 * Section 102 grant-price basis. Returns null if history is unavailable.
 */
export async function fetchGrantPrice(
  symbol: string,
  grantDate: Date,
): Promise<number | null> {
  const period2 = Math.floor(grantDate.getTime() / 1000);
  // Reach back ~50 calendar days to capture ~30 trading days.
  const period1 = period2 - 50 * 24 * 60 * 60;
  const data = await fetchJsonWithFallback<YahooChart>(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol,
    )}?period1=${period1}&period2=${period2}&interval=1d`,
  );
  const result = data?.chart?.result?.[0];
  const closes = result?.indicators?.quote?.[0]?.close;
  const currency = result?.meta?.currency;
  if (!closes) return null;
  const valid = closes
    .filter((c): c is number => typeof c === "number")
    .slice(-30);
  if (valid.length === 0) return null;
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  return normalizePrice(avg, currency);
}
