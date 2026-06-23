import { SECTION_102_HOLDING_YEARS, yearConstants } from "./constants";
import { computeFees, type FeeBreakdown } from "./fees";
import { marginalIncomeTax } from "./income";
import { bituahOnExtra } from "./bituah";
import { surtax } from "./surtax";
import type { SaleFees, TaxProfile } from "./types";

export interface RsuGrantInput {
  /** Number of shares from this grant to sell (>= 1). */
  shares: number;
  /** Effective price per share at sale, in the listing currency (USD or ILS). */
  stockPrice: number;
  /** Average price per share over the 30 working days before the grant date. */
  grantPrice: number;
  /** Grant date (used for the 2-year capital-track rule). */
  grantDate: Date;
  /** USD→ILS rate; use 1 for TASE (ILS-denominated) listings. */
  fxRate: number;
  /** True for Tel-Aviv (TASE) listings — results stay in ILS, no conversion fee. */
  isTase: boolean;
  /** Force the 2-year capital-gains rule even if 2 years have not yet passed. */
  whatIf2Years: boolean;
  /** Monthly salary at the workplace that granted this RSU (for Bituah Leumi). */
  workplaceMonthlySalary: number;
  /** Per-grant fee overrides. */
  fees: SaleFees;
}

export interface RsuGrantResult {
  shares: number;
  /** Sale value before tax: stockPrice × shares × fx (ILS). */
  gross: number;
  fees: FeeBreakdown;
  /** Conversion fee (ILS), only for USD listings. */
  conversionFee: number;
  /** Whether the capital track (>= 2 years) applies. */
  qualified: boolean;
  /** Income (revenue) portion subject to marginal tax (ILS). */
  incomePortion: number;
  /** Capital portion subject to 25% capital-gains tax (ILS). */
  capitalPortion: number;
  marginalTax: number;
  bituah: number;
  capitalTax: number;
  /** marginal + bituah + capital. */
  totalTax: number;
  /** Effective rate: totalTax / gross. */
  averageTaxRate: number;
  /** Gross − fees − totalTax. */
  totalNet: number;
  /** Amount transferred to the bank on the sale day. */
  netToBank: number;
  /** Income-tax over-withholding returned via salary (or claimable as refund). */
  netToSalary: number;
  /** Whether netToSalary should be presented as a refund (left employer). */
  isRefund: boolean;
  /** Future price at which waiting to the 2-year mark matches selling now. */
  breakEvenPrice2y: number | null;
}

function holdingQualified(grantDate: Date, asOf: Date): boolean {
  const cutoff = new Date(grantDate);
  cutoff.setFullYear(cutoff.getFullYear() + SECTION_102_HOLDING_YEARS);
  return asOf >= cutoff;
}

/**
 * Core after-tax computation for a single RSU grant under Section 102 (capital
 * track). When the 2-year holding is met, the grant-date value is ordinary
 * income and the appreciation is taxed at the capital-gains rate; otherwise the
 * entire benefit is ordinary income.
 */
export function computeRsuGrant(
  input: RsuGrantInput,
  profile: TaxProfile,
  asOf: Date = new Date(),
  // Internal: the break-even solver re-runs this computation many times over and
  // does not need (and must not trigger) a nested break-even, which would recurse.
  withBreakEven = true,
): RsuGrantResult {
  const yc = yearConstants(profile.year);
  const fx = input.isTase ? 1 : input.fxRate;

  const grossListing = input.stockPrice * input.shares; // listing currency
  const gross = grossListing * fx; // ILS

  const fees = computeFees(grossListing, input.fees);
  const feesIls = {
    foreign: fees.foreign * fx,
    service: fees.service * fx,
    afterFeeGross: fees.afterFeeGross * fx,
    wire: input.isTase ? fees.wire : fees.wire * fx,
    total: 0,
  };
  feesIls.total = feesIls.foreign + feesIls.service + feesIls.wire;
  // Trustee USD→ILS conversion fee only applies to foreign listings.
  const conversionFee = input.isTase ? 0 : gross * input.fees.conversionFee;

  const qualified =
    input.whatIf2Years || holdingQualified(input.grantDate, asOf);

  const grantValueIls = input.grantPrice * input.shares * fx;
  let incomePortion: number;
  let capitalPortion: number;
  if (qualified) {
    // The grant-date value is ordinary income, but never more than the actual
    // proceeds: if the share fell below the grant-date average, all proceeds are
    // ordinary income and the shortfall is a capital loss, not extra income.
    incomePortion = Math.min(grantValueIls, gross);
    capitalPortion = Math.max(0, gross - grantValueIls);
  } else {
    // No capital track: the whole benefit is ordinary income.
    incomePortion = gross;
    capitalPortion = 0;
  }

  const baseAnnual = profile.noIncomeYear ? 0 : profile.monthlySalary * 12;
  const marginalTax = marginalIncomeTax(baseAnnual, incomePortion, yc);

  // Bituah Leumi uses the salary at the granting workplace, as a one-month slice.
  const bituahSalary = profile.noIncomeYear
    ? input.workplaceMonthlySalary
    : input.workplaceMonthlySalary || profile.monthlySalary;
  const bituah = bituahOnExtra(bituahSalary, incomePortion, yc);

  const capitalTax = capitalPortion * yc.capitalGainsRate;

  const totalTax = marginalTax + bituah + capitalTax;
  const averageTaxRate = gross > 0 ? totalTax / gross : 0;

  const totalNet = gross - feesIls.total - conversionFee - totalTax;

  // Trustees withhold income tax at the top marginal rate, then the difference
  // versus the real marginal rate is returned via salary (or as a refund).
  const topRate = yc.brackets[yc.brackets.length - 1].rate;
  const withheldIncomeTax = incomePortion * topRate;
  const netToSalary = withheldIncomeTax - marginalTax;
  const netToBank =
    gross - feesIls.total - conversionFee - bituah - capitalTax - withheldIncomeTax;

  return {
    shares: input.shares,
    gross,
    fees: feesIls,
    conversionFee,
    qualified,
    incomePortion,
    capitalPortion,
    marginalTax,
    bituah,
    capitalTax,
    totalTax,
    averageTaxRate,
    totalNet,
    netToBank,
    netToSalary,
    isRefund: false,
    breakEvenPrice2y: withBreakEven
      ? breakEvenPrice2y(input, profile, asOf)
      : null,
  };
}

/**
 * The future stock price at which waiting until the 2-year mark and selling then
 * yields the same total net as selling now. Returns null if 2 years already
 * passed (the rule is moot) or no positive solution exists.
 */
function breakEvenPrice2y(
  input: RsuGrantInput,
  profile: TaxProfile,
  asOf: Date,
): number | null {
  if (input.whatIf2Years || holdingQualified(input.grantDate, asOf)) return null;

  // The early return above guarantees the grant is still non-qualified, so
  // selling now taxes the whole benefit as ordinary income — that is the
  // baseline we compare a future qualified sale against.
  const netNow = computeRsuGrant(
    { ...input, whatIf2Years: false },
    profile,
    asOf,
    false,
  ).totalNet;

  // Solve for the price P such that the qualified-sale net equals netNow.
  // Net(P) is piecewise-linear in P, so a monotonic bisection is robust.
  const f = (price: number) =>
    computeRsuGrant(
      { ...input, stockPrice: price, whatIf2Years: true },
      profile,
      asOf,
      false,
    ).totalNet - netNow;

  let lo = 0;
  let hi = Math.max(input.stockPrice * 4, input.grantPrice * 4, 1);
  if (f(hi) < 0) return null;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export interface RsuCombinedResult {
  grants: RsuGrantResult[];
  gross: number;
  totalTax: number;
  averageTaxRate: number;
  totalNet: number;
  netToBank: number;
  netToSalary: number;
  marginalTax: number;
  bituah: number;
  capitalTax: number;
  surtax: number;
}

/** Combine several grants and compute year-level surtax across all of them. */
export function combineRsuGrants(
  grants: RsuGrantResult[],
  profile: TaxProfile,
): RsuCombinedResult {
  const yc = yearConstants(profile.year);
  const sum = (f: (g: RsuGrantResult) => number) =>
    grants.reduce((acc, g) => acc + f(g), 0);

  const gross = sum((g) => g.gross);
  const totalTax = sum((g) => g.totalTax);
  const marginal = sum((g) => g.marginalTax);
  const bituah = sum((g) => g.bituah);
  const capitalTax = sum((g) => g.capitalTax);
  const incomePortion = sum((g) => g.incomePortion);
  const capitalPortion = sum((g) => g.capitalPortion);

  const baseAnnual = profile.noIncomeYear ? 0 : profile.monthlySalary * 12;
  const surtaxOwed = surtax(
    {
      ordinaryIncome: incomePortion,
      capitalIncome: capitalPortion,
      baseAnnualIncome: baseAnnual,
      extraCapitalGain: profile.extraCapitalGain,
    },
    yc,
  );

  return {
    grants,
    gross,
    totalTax,
    averageTaxRate: gross > 0 ? totalTax / gross : 0,
    totalNet: sum((g) => g.totalNet) - surtaxOwed,
    netToBank: sum((g) => g.netToBank),
    netToSalary: sum((g) => g.netToSalary),
    marginalTax: marginal,
    bituah,
    capitalTax,
    surtax: surtaxOwed,
  };
}
