import { yearConstants } from "./constants";

/**
 * The gross monthly amount Bituah Leumi would pay during reserve duty (miluim)
 * or maternity leave. It is based on the post-sale salary base — the regular
 * monthly salary plus the sale's income portion spread over the year — capped at
 * the National Insurance monthly ceiling.
 */
export function monthlySalaryBase(
  monthlySalary: number,
  annualIncomePortion: number,
  year: number,
): number {
  const yc = yearConstants(year);
  const base = monthlySalary + Math.max(0, annualIncomePortion) / 12;
  return Math.min(base, yc.bituah.ceilingMonthly);
}

/** Gross monthly miluim (reserve duty) pay. */
export function monthlyMiluimPay(
  monthlySalary: number,
  annualIncomePortion: number,
  year: number,
): number {
  return monthlySalaryBase(monthlySalary, annualIncomePortion, year);
}

/** Gross monthly maternity pay. The full 105-day entitlement is monthly × 3.5. */
export function monthlyMaternityPay(
  monthlySalary: number,
  annualIncomePortion: number,
  year: number,
): number {
  return monthlySalaryBase(monthlySalary, annualIncomePortion, year);
}

/** Full 105-day maternity entitlement = 3.5 monthly payments. */
export const MATERNITY_FULL_FACTOR = 3.5;
