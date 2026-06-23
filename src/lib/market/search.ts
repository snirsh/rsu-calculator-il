import { fetchJsonWithFallback } from "./http";

export interface SymbolMatch {
  symbol: string;
  name: string;
  exchange: string;
}

interface YahooSearch {
  quotes?: {
    symbol?: string;
    shortname?: string;
    longname?: string;
    exchDisp?: string;
    quoteType?: string;
  }[];
}

let bundledCache: SymbolMatch[] | null = null;

/** Load the bundled offline ticker list (served from the app base path). */
async function loadBundled(): Promise<SymbolMatch[]> {
  if (bundledCache) return bundledCache;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}tickers.json`);
    bundledCache = (await res.json()) as SymbolMatch[];
  } catch {
    bundledCache = [];
  }
  return bundledCache;
}

function filterBundled(list: SymbolMatch[], query: string): SymbolMatch[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  return list
    .filter(
      (m) =>
        m.symbol.toUpperCase().includes(q) ||
        m.name.toUpperCase().includes(q),
    )
    .slice(0, 8);
}

/**
 * Symbol autocomplete. Tries Yahoo's live search first, then falls back to the
 * bundled offline list so suggestions still work without network access.
 */
export async function searchSymbols(query: string): Promise<SymbolMatch[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const data = await fetchJsonWithFallback<YahooSearch>(
    `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      q,
    )}&quotesCount=8&newsCount=0`,
  );
  const live = (data?.quotes ?? [])
    .filter((x) => x.symbol && (x.quoteType === "EQUITY" || x.quoteType === "ETF"))
    .map((x) => ({
      symbol: x.symbol as string,
      name: x.longname ?? x.shortname ?? (x.symbol as string),
      exchange: x.exchDisp ?? "",
    }));
  if (live.length > 0) return live;

  return filterBundled(await loadBundled(), q);
}
