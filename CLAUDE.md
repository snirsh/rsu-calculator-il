# CLAUDE.md

Guidance for AI agents (and humans) working in this repository. This project is
designed to be developed largely through agentic, automated flows, so keep this
file accurate when you change structure or conventions.

## What this is

A static, client-side **Israeli RSU & ESPP after-tax calculator**. It estimates
net proceeds when selling RSUs or ESPP shares under **Section 102** of the
Israeli Income Tax Ordinance (capital track). It ships as a Vite + React + TS
single-page app and deploys to **GitHub Pages**.

Key product rules:

- **No user data is ever persisted or transmitted.** All computation happens in
  the browser. Do not add analytics, cookies, localStorage of personal inputs,
  or any backend that receives user figures.
- Market data (stock price, USD/ILS rate, grant-date average) is fetched
  best-effort from free, key-less public APIs, and **every value has a manual
  override** so the app is fully usable offline.

## Layout

```
src/lib/tax/        Pure tax engine (no React). The heart of the project.
  constants.ts      Brackets, Bituah Leumi rates, ceilings, surtax — per year.
  income.ts         Progressive + marginal income tax.
  bituah.ts         National Insurance + health (spread over 12 months).
  surtax.ts         "Mas yesef" (3% / 5%) and Magen Mas.
  fees.ts           Broker/trustee sale fees.
  rsu.ts            RSU Section 102 computation + 2-year break-even.
  espp.ts           ESPP with/without trustee + dual-currency capital methods.
  sellingTips.ts    Miluim / maternity monthly pay.
  __tests__/        Vitest unit tests, incl. the reference example fixtures.
src/lib/market/     FX, quotes, symbol search (best-effort, fail-soft).
src/components/     React UI. Pure presentation over the engine.
public/tickers.json Offline symbol-autocomplete fallback list.
```

## Conventions

- **Keep the engine pure and framework-free.** All money inside the engine is in
  ILS unless a name ends in `Usd`. Conversion happens at the UI edge.
- **`constants.ts` is the single source of truth** for tax figures. To support a
  new tax year, add an entry and (if appropriate) bump `DEFAULT_YEAR`.
- Network code must **never throw to the UI** — return `null` and let the manual
  override take over.
- Validate any engine change against `src/lib/tax/__tests__/examples.test.ts`.
  Those fixtures encode the reference examples; identities (gross, gross
  investment, net/bank/salary splits) must stay exact, statutory figures within
  the documented tolerance.

## Commands

```bash
npm install      # or: npm ci
npm run dev      # local dev server
npm test         # vitest (run once)
npm run lint     # eslint
npm run typecheck
npm run build    # tsc + vite build → dist/
```

## Deployment

`.github/workflows/deploy.yml` builds on push to `main` and publishes `dist/` to
GitHub Pages. The base path is set to `/<repo>/` via `BASE_PATH`. Enable Pages
with "GitHub Actions" as the source in repo settings.

## Accuracy note

Figures follow published Israeli statutory rates and Section 102 mechanics. The
exact monthly proration used by any specific commercial tool may differ slightly;
the engine targets the reference examples within a small tolerance. This is not
tax advice — always state that in user-facing copy.
