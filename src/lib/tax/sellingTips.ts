import { yearConstants } from "./constants";

/** Length of the Bituah Leumi look-back window, in months. */
const BENEFIT_BASE_MONTHS = 3;

/**
 * The gross monthly amount Bituah Leumi would pay during reserve duty (miluim)
 * or maternity leave.
 *
 * Both benefits derive the daily rate from the gross income reported in the
 * three months preceding the event (income / 90), so the equivalent monthly
 * benefit is the average monthly income across that 3-month window, capped at
 * the National Insurance monthly ceiling. A one-time RSU/ESPP income portion is
 * reported in a single month, so within the window it lifts the monthly base by
 * its value spread over those three months (portion / 3) — which is exactly the
 * boost a pre-event sale produces.
 */
export function monthlySalaryBase(
  monthlySalary: number,
  saleIncomePortion: number,
  year: number,
): number {
  const yc = yearConstants(year);
  const base =
    monthlySalary + Math.max(0, saleIncomePortion) / BENEFIT_BASE_MONTHS;
  return Math.min(base, yc.bituah.ceilingMonthly);
}

/** Gross monthly miluim (reserve duty) pay. */
export function monthlyMiluimPay(
  monthlySalary: number,
  saleIncomePortion: number,
  year: number,
): number {
  return monthlySalaryBase(monthlySalary, saleIncomePortion, year);
}

/** Gross monthly maternity pay. The full 105-day entitlement is monthly × 3.5. */
export function monthlyMaternityPay(
  monthlySalary: number,
  saleIncomePortion: number,
  year: number,
): number {
  return monthlySalaryBase(monthlySalary, saleIncomePortion, year);
}

/** Full 105-day maternity entitlement = 3.5 monthly payments. */
export const MATERNITY_FULL_FACTOR = 3.5;
