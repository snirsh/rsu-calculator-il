import type { SaleFees, YearConstants } from "./types";

// ---------------------------------------------------------------------------
// Israeli tax constants, by year.
//
// Sources: the published Income Tax Ordinance brackets, Bituah Leumi (National
// Insurance) employee rates, and the Section 102 capital-gains rate. Israel
// froze the income-tax brackets for 2025 (no indexation), so 2025 reuses the
// 2024 thresholds. 2026 defaults to the same frozen values until updated.
//
// To update for a new year: add an entry and (if needed) change DEFAULT_YEAR.
// Everything downstream reads from here, so this is the single source of truth.
// ---------------------------------------------------------------------------

const BRACKETS_2024 = [
  { upTo: 84_120, rate: 0.1 },
  { upTo: 120_720, rate: 0.14 },
  { upTo: 193_800, rate: 0.2 },
  { upTo: 269_280, rate: 0.31 },
  { upTo: 560_280, rate: 0.35 },
  { upTo: 721_560, rate: 0.47 },
  { upTo: Infinity, rate: 0.5 },
];

const BITUAH_2024 = {
  // 60% of the average wage; below this the reduced rate applies.
  reducedThresholdMonthly: 7_522,
  reducedRate: 0.035, // 0.4% NI + 3.1% health
  fullRate: 0.12, // 7% NI + 5% health
  ceilingMonthly: 49_030,
};

const BITUAH_2025 = {
  reducedThresholdMonthly: 7_522,
  reducedRate: 0.035,
  fullRate: 0.12,
  ceilingMonthly: 50_695,
};

const SURTAX_COMMON = {
  thresholdAnnual: 721_560,
  rate: 0.03,
  // From 2025 an extra 2% applies to capital / passive income above the
  // threshold, for a combined 5% on that income.
  capitalExtraRate: 0.02,
};

export const YEARS: Record<number, YearConstants> = {
  2024: {
    year: 2024,
    brackets: BRACKETS_2024,
    bituah: BITUAH_2024,
    capitalGainsRate: 0.25,
    surtax: { ...SURTAX_COMMON, capitalExtraRate: 0 },
  },
  2025: {
    year: 2025,
    brackets: BRACKETS_2024, // frozen for 2025
    bituah: BITUAH_2025,
    capitalGainsRate: 0.25,
    surtax: SURTAX_COMMON,
  },
  2026: {
    year: 2026,
    brackets: BRACKETS_2024, // default until 2026 indexation is published
    bituah: BITUAH_2025,
    capitalGainsRate: 0.25,
    surtax: SURTAX_COMMON,
  },
};

export const DEFAULT_YEAR = 2025;

export function yearConstants(year: number): YearConstants {
  return YEARS[year] ?? YEARS[DEFAULT_YEAR];
}

export const SUPPORTED_YEARS = Object.keys(YEARS)
  .map(Number)
  .sort((a, b) => a - b);

// ---------------------------------------------------------------------------
// Default broker / trustee sale fees. Users can override each of these per
// grant. Ranges accepted by the UI: foreign 0.01%–0.10%, service 0.03%–0.60%,
// wire 0–50, conversion 0%–2%.
// ---------------------------------------------------------------------------
export const DEFAULT_FEES: SaleFees = {
  foreignFee: 0.0007, // 0.07%
  serviceFee: 0.006, // 0.60%
  wireFee: 20, // flat, in the sale currency
  conversionFee: 0.0, // applied only when converting USD→ILS via trustee
};

/** The number of capital-track holding years required by Section 102. */
export const SECTION_102_HOLDING_YEARS = 2;
