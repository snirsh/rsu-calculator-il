import type { YearConstants } from "./types";

/**
 * Bituah Leumi (National Insurance) + health insurance, employee side, on a
 * single month's slice of income sitting on top of the regular monthly salary.
 *
 * Two tiers (reduced below 60% of the average wage, full above it) and a monthly
 * ceiling above which no contribution is due.
 */
export function bituahOnMonthlySlice(
  monthlySalary: number,
  extraMonthlyIncome: number,
  yc: YearConstants,
): number {
  if (extraMonthlyIncome <= 0) return 0;
  const { reducedThresholdMonthly, reducedRate, fullRate, ceilingMonthly } =
    yc.bituah;

  const base = Math.max(0, monthlySalary);
  const top = Math.min(base + extraMonthlyIncome, ceilingMonthly);
  if (top <= base) return 0; // already at/above the ceiling

  let contribution = 0;
  const reducedTop = Math.min(top, reducedThresholdMonthly);
  if (reducedTop > base) {
    contribution += (reducedTop - base) * reducedRate;
  }
  const fullBottom = Math.max(base, reducedThresholdMonthly);
  if (top > fullBottom) {
    contribution += (top - fullBottom) * fullRate;
  }
  return contribution;
}

/**
 * Bituah Leumi + health on a year's worth of RSU/ESPP income. Such income is
 * spread across the 12 months on top of the regular salary, so each month's
 * slice is assessed against the tier thresholds and the monthly ceiling, then
 * summed. This is what makes the effective rate land near the full 12% rather
 * than being clipped by a single-month ceiling.
 */
export function bituahOnExtra(
  monthlySalary: number,
  annualExtraIncome: number,
  yc: YearConstants,
): number {
  if (annualExtraIncome <= 0) return 0;
  return 12 * bituahOnMonthlySlice(monthlySalary, annualExtraIncome / 12, yc);
}
