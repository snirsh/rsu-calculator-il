// Tiny fetch helpers for the client-side market-data layer.
//
// Everything here is best-effort: the calculator is fully usable offline because
// every market value (FX rate, stock price, grant price) has a manual override
// in the UI. Network calls therefore fail soft and never throw to the UI.

/** Public CORS proxies, tried in order, used to reach APIs that lack CORS. */
const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

/** Fetch JSON directly, then via CORS proxies, returning null on total failure. */
export async function fetchJsonWithFallback<T>(
  url: string,
  timeoutMs = 8000,
): Promise<T | null> {
  const candidates = [url, ...CORS_PROXIES.map((p) => p(url))];
  for (const candidate of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(candidate, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      return (await res.json()) as T;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}
