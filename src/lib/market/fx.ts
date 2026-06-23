import { fetchJsonWithFallback } from "./http";

/** A sensible fallback if every FX source is unreachable. The user can override. */
export const FALLBACK_USD_ILS = 3.7;

interface FrankfurterResponse {
  rates?: { ILS?: number };
}

interface ErApiResponse {
  rates?: { ILS?: number };
  result?: string;
}

/**
 * Live USD→ILS rate. Tries two free, key-less, CORS-friendly providers and falls
 * back to a static rate. Never throws.
 */
export async function fetchUsdIls(): Promise<{ rate: number; live: boolean }> {
  const frankfurter = await fetchJsonWithFallback<FrankfurterResponse>(
    "https://api.frankfurter.app/latest?from=USD&to=ILS",
  );
  if (frankfurter?.rates?.ILS) {
    return { rate: frankfurter.rates.ILS, live: true };
  }

  const erApi = await fetchJsonWithFallback<ErApiResponse>(
    "https://open.er-api.com/v6/latest/USD",
  );
  if (erApi?.rates?.ILS) {
    return { rate: erApi.rates.ILS, live: true };
  }

  return { rate: FALLBACK_USD_ILS, live: false };
}

/** Historical USD→ILS rate for a given date (used for ESPP purchase-day rate). */
export async function fetchUsdIlsOn(date: string): Promise<number | null> {
  const data = await fetchJsonWithFallback<FrankfurterResponse>(
    `https://api.frankfurter.app/${date}?from=USD&to=ILS`,
  );
  return data?.rates?.ILS ?? null;
}
