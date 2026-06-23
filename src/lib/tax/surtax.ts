import type { YearConstants } from "./types";

export interface SurtaxInput {
  /** Ordinary (income-portion) taxable amount realised this year, ILS. */
  ordinaryIncome: number;
  /** Capital-portion taxable amount realised this year, ILS (may be negative). */
  capitalIncome: number;
  /** Salary already counted toward the annual threshold, ILS. */
  baseAnnualIncome: number;
  /** Extra capital gain (+) or loss (−) realised elsewhere this year, ILS. */
  extraCapitalGain: number;
}

/**
 * Israeli surtax ("mas yesef"): an extra 3% on total annual income above the
 * threshold, plus (from 2025) an extra 2% on the capital / passive slice of
 * that excess.
 *
 * Returns a positive number when surtax is owed, or a negative number ("Magen
 * Mas") when net losses this year can be carried to reduce future tax.
 */
export function surtax(input: SurtaxInput, yc: YearConstants): number {
  const { thresholdAnnual, rate, capitalExtraRate } = yc.surtax;
  const capital = input.capitalIncome + input.extraCapitalGain;

  // A net capital loss this year produces a negative "Magen Mas" figure.
  if (capital < 0) {
    return capital * (rate + capitalExtraRate);
  }

  const totalAnnual =
    input.baseAnnualIncome + input.ordinaryIncome + capital;
  const excess = totalAnnual - thresholdAnnual;
  if (excess <= 0) return 0;

  // Base 3% applies to all income above the threshold.
  let owed = excess * rate;
  // The extra capital rate applies only to the capital slice of the excess.
  const capitalInExcess = Math.min(excess, Math.max(0, capital));
  owed += capitalInExcess * capitalExtraRate;
  return owed;
}
