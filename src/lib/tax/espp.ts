import { SECTION_102_HOLDING_YEARS, yearConstants } from "./constants";
import { computeFees, type FeeBreakdown } from "./fees";
import { marginalIncomeTax } from "./income";
import { bituahOnExtra } from "./bituah";
import { surtax } from "./surtax";
import type { SaleFees, TaxProfile } from "./types";

export interface EsppPlanInput {
  /** Section 102 trustee mode. Off = direct purchase, tax already withheld. */
  withTrustee: boolean;
  /** Plan end date — starts the 2-year capital-gains clock (trustee mode). */
  planEndDate: Date;
  /** Shares held (>= 1). */
  shares: number;
  /** Current price per share, listing currency (USD or ILS). */
  stockPrice: number;
  /** Price before the ESPP discount (the market reference price). */
  purchasedPrice: number;
  /** Price actually paid per share, after the discount. */
  discountedPrice: number;
  /** USD→ILS rate at sale (use 1 for TASE listings). */
  fxRate: number;
  /** USD→ILS rate on the purchase day. If undefined, the sale rate is used. */
  fxRateAtPurchase?: number;
  /** True for TASE listings — results stay in ILS, no conversion fee. */
  isTase: boolean;
  /** Force the 2-year capital-gains rule even if not yet met. */
  whatIf2Years: boolean;
  fees: SaleFees;
}

export interface EsppResult {
  shares: number;
  withTrustee: boolean;
  qualified: boolean;
  gross: number;
  fees: FeeBreakdown;
  conversionFee: number;
  /** Discounted × shares × fx(purchase) — what you paid (ILS). */
  grossInvestment: number;
  /** gross − grossInvestment (ILS). Negative ⇒ a loss. */
  grossGain: number;
  /** Discount benefit subject to marginal tax (ILS). */
  discountIncome: number;
  marginalTax: number;
  bituah: number;
  /** Tax withheld at purchase (direct purchase / no-trustee mode). */
  taxOnDiscountPaid: number;
  capitalTax: number;
  /** Capital-gains computation detail (the two dual-currency methods). */
  capitalMethods: { shekel: number; dollar: number; basis: number };
  totalTax: number;
  averageTaxRate: number;
  totalNet: number;
  netToBank: number;
  netToSalary: number;
  netGain: number;
  surtax: number;
}

function qualifiedFor102(planEnd: Date, asOf: Date, whatIf: boolean): boolean {
  if (whatIf) return true;
  const cutoff = new Date(planEnd);
  cutoff.setFullYear(cutoff.getFullYear() + SECTION_102_HOLDING_YEARS);
  return asOf >= cutoff;
}

/**
 * After-tax computation for an ESPP holding. The discount (purchase − discounted
 * price) is ordinary income; the appreciation above the purchase price is a
 * capital gain. With a trustee under Section 102 the capital portion is taxed at
 * 25% once qualified; without a trustee the discount tax is already withheld.
 */
export function computeEspp(
  input: EsppPlanInput,
  profile: TaxProfile,
  asOf: Date = new Date(),
): EsppResult {
  const yc = yearConstants(profile.year);
  const fx = input.isTase ? 1 : input.fxRate;
  const fxPurchase = input.isTase ? 1 : input.fxRateAtPurchase ?? fx;

  const grossListing = input.stockPrice * input.shares;
  const gross = grossListing * fx;

  const fees = computeFees(grossListing, input.fees);
  const feesIls = {
    foreign: fees.foreign * fx,
    service: fees.service * fx,
    afterFeeGross: fees.afterFeeGross * fx,
    wire: input.isTase ? fees.wire : fees.wire * fx,
    total: 0,
  };
  feesIls.total = feesIls.foreign + feesIls.service + feesIls.wire;
  const conversionFee = input.isTase ? 0 : gross * input.fees.conversionFee;

  const grossInvestment = input.discountedPrice * input.shares * fxPurchase;
  const grossGain = gross - grossInvestment;

  // Discount benefit = (purchase − discounted) per share, valued at sale rate.
  const discountIncome = Math.max(
    0,
    (input.purchasedPrice - input.discountedPrice) * input.shares * fx,
  );

  const baseAnnual = profile.noIncomeYear ? 0 : profile.monthlySalary * 12;
  const marginalTax = marginalIncomeTax(baseAnnual, discountIncome, yc);
  const bituahSalary = profile.noIncomeYear ? 0 : profile.monthlySalary;
  const bituah = bituahOnExtra(bituahSalary, discountIncome, yc);

  // Capital gain above the (pre-discount) purchase price, two dual-currency ways.
  const costAtPurchase = input.purchasedPrice * input.shares * fxPurchase;
  const shekelGain = gross - costAtPurchase; // nominal ILS gain
  const dollarGain = (input.stockPrice - input.purchasedPrice) * input.shares * fx; // USD gain @ sale rate
  let capitalBasis: number;
  if (shekelGain <= 0 && dollarGain <= 0) {
    capitalBasis = 0; // both losses → no tax (Magen Mas)
  } else if (shekelGain > 0 !== dollarGain > 0) {
    capitalBasis = 0; // opposite signs → no tax
  } else {
    capitalBasis = Math.min(shekelGain, dollarGain); // both positive → lower one
  }

  const qualified = qualifiedFor102(
    input.planEndDate,
    asOf,
    input.whatIf2Years,
  );

  let capitalTax = 0;
  let netMarginal = marginalTax;
  let netBituah = bituah;
  let taxOnDiscountPaid = 0;

  if (input.withTrustee) {
    capitalTax = capitalBasis * yc.capitalGainsRate;
  } else {
    // Direct purchase: the discount tax was already withheld at purchase.
    taxOnDiscountPaid = marginalTax + bituah;
    netMarginal = 0;
    netBituah = 0;
    capitalTax = capitalBasis * yc.capitalGainsRate;
  }

  const totalTax = netMarginal + netBituah + capitalTax;
  const averageTaxRate =
    grossGain > 0 ? (grossGain - (grossGain - totalTax - feesIls.total - conversionFee)) / grossGain : 0;

  const totalNet = gross - feesIls.total - conversionFee - totalTax;
  const netGain = totalNet - grossInvestment;

  // Income-tax over-withholding returned via salary (trustee mode only).
  const topRate = yc.brackets[yc.brackets.length - 1].rate;
  const withheldIncomeTax = input.withTrustee ? discountIncome * topRate : 0;
  const netToSalary = input.withTrustee ? withheldIncomeTax - marginalTax : 0;
  const netToBank = input.withTrustee
    ? gross - feesIls.total - conversionFee - netBituah - capitalTax - withheldIncomeTax
    : totalNet;

  const surtaxOwed = surtax(
    {
      ordinaryIncome: input.withTrustee ? discountIncome : 0,
      capitalIncome: capitalBasis,
      baseAnnualIncome: baseAnnual,
      extraCapitalGain: profile.extraCapitalGain,
    },
    yc,
  );

  return {
    shares: input.shares,
    withTrustee: input.withTrustee,
    qualified,
    gross,
    fees: feesIls,
    conversionFee,
    grossInvestment,
    grossGain,
    discountIncome,
    marginalTax: netMarginal,
    bituah: netBituah,
    taxOnDiscountPaid,
    capitalTax,
    capitalMethods: { shekel: shekelGain, dollar: dollarGain, basis: capitalBasis },
    totalTax,
    averageTaxRate,
    totalNet: totalNet - surtaxOwed,
    netToBank,
    netToSalary,
    netGain: netGain - surtaxOwed,
    surtax: surtaxOwed,
  };
}
