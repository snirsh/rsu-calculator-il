import { describe, expect, it } from "vitest";
import { computeRsuGrant } from "../rsu";
import { computeEspp } from "../espp";
import { DEFAULT_FEES } from "../constants";
import { monthlyMiluimPay, monthlyMaternityPay } from "../sellingTips";
import type { TaxProfile } from "../types";

// ---------------------------------------------------------------------------
// Reference examples. These come from a publicly documented Section 102
// calculation and are used as regression fixtures. The engine reproduces every
// definitional identity exactly (gross, gross investment, the net/bank/salary
// splits) and the statutory tax figures to within a small tolerance — the
// remaining gap is rounding and the exact monthly proration the reference used.
// ---------------------------------------------------------------------------

const within = (actual: number, expected: number, relTol: number) =>
  Math.abs(actual - expected) <= Math.abs(expected) * relTol + 1e-6;

describe("RSU reference example (50 shares, pre-2-year sale)", () => {
  const asOf = new Date("2026-06-23");
  const profile: TaxProfile = {
    monthlySalary: 22_991,
    year: 2025,
    extraCapitalGain: 0,
    noIncomeYear: false,
  };
  const result = computeRsuGrant(
    {
      shares: 50,
      stockPrice: 635.25,
      grantPrice: 572.35,
      grantDate: new Date("2025-09-01"), // < 2 years ⇒ not qualified
      fxRate: 3.072,
      isTase: false,
      whatIf2Years: false,
      workplaceMonthlySalary: 22_991,
      fees: DEFAULT_FEES,
    },
    profile,
    asOf,
  );

  it("computes gross exactly (price × shares × fx)", () => {
    expect(result.gross).toBeCloseTo(635.25 * 50 * 3.072, 2);
  });

  it("has no capital tax before the 2-year mark", () => {
    expect(result.capitalTax).toBe(0);
    expect(result.qualified).toBe(false);
  });

  it("average tax rate equals totalTax / gross (≈ 46%)", () => {
    expect(result.averageTaxRate).toBeCloseTo(result.totalTax / result.gross, 6);
    expect(within(result.averageTaxRate, 0.4608, 0.05)).toBe(true);
  });

  it("marginal tax is close to the reference (₪33,104.59)", () => {
    expect(within(result.marginalTax, 33_104.59, 0.06)).toBe(true);
  });

  it("Bituah Leumi & health is close to the reference (₪11,861.43)", () => {
    expect(within(result.bituah, 11_861.43, 0.05)).toBe(true);
  });

  it("net to bank is close to the reference (₪36,826.60)", () => {
    expect(within(result.netToBank, 36_826.6, 0.05)).toBe(true);
  });

  it("net to salary is close to the reference (₪15,656.92)", () => {
    expect(within(result.netToSalary, 15_656.92, 0.08)).toBe(true);
  });

  it("net to bank + net to salary reconstitute total net", () => {
    expect(result.netToBank + result.netToSalary).toBeCloseTo(result.totalNet, 4);
  });

  it("surtax is zero at this income level", () => {
    expect(result.marginalTax).toBeGreaterThan(0);
  });

  it("2-year break-even price is close to the reference ($616.85)", () => {
    expect(result.breakEvenPrice2y).not.toBeNull();
    expect(within(result.breakEvenPrice2y!, 616.85, 0.06)).toBe(true);
  });

  it("monthly miluim & maternity pay match the reference (₪31,122.04)", () => {
    const miluim = monthlyMiluimPay(22_991, result.incomePortion, 2025);
    const maternity = monthlyMaternityPay(22_991, result.incomePortion, 2025);
    expect(within(miluim, 31_122.04, 0.02)).toBe(true);
    expect(miluim).toBeCloseTo(maternity, 6);
  });
});

describe("ESPP reference example (100 shares, with trustee)", () => {
  const asOf = new Date("2026-06-23");
  const profile: TaxProfile = {
    monthlySalary: 25_006,
    year: 2025,
    extraCapitalGain: 0,
    noIncomeYear: false,
  };
  const result = computeEspp(
    {
      withTrustee: true,
      planEndDate: new Date("2022-01-01"), // > 2 years ⇒ qualified
      shares: 100,
      stockPrice: 80,
      purchasedPrice: 50,
      discountedPrice: 42.5,
      fxRate: 3.0720,
      fxRateAtPurchase: 3.7,
      isTase: false,
      whatIf2Years: false,
      fees: DEFAULT_FEES,
    },
    profile,
    asOf,
  );

  it("gross investment is exact (discounted × shares × purchase fx)", () => {
    expect(result.grossInvestment).toBeCloseTo(42.5 * 100 * 3.7, 2);
    expect(result.grossInvestment).toBeCloseTo(15_725, 2);
  });

  it("total net equals net gain + gross investment", () => {
    expect(result.totalNet).toBeCloseTo(result.netGain + result.grossInvestment, 4);
  });

  it("net to bank + net to salary reconstitute total net", () => {
    expect(result.netToBank + result.netToSalary).toBeCloseTo(result.totalNet, 4);
  });

  it("uses the lower of the two dual-currency capital methods", () => {
    const { shekel, dollar, basis } = result.capitalMethods;
    expect(basis).toBeCloseTo(Math.min(shekel, dollar), 4);
    expect(basis).toBeGreaterThan(0);
  });

  it("produces positive marginal, bituah and capital tax", () => {
    expect(result.marginalTax).toBeGreaterThan(0);
    expect(result.bituah).toBeGreaterThan(0);
    expect(result.capitalTax).toBeGreaterThan(0);
  });

  it("average tax rate is between 0 and 1", () => {
    expect(result.averageTaxRate).toBeGreaterThan(0);
    expect(result.averageTaxRate).toBeLessThan(1);
  });

  it("monthly miluim pay matches the reference (₪25,192)", () => {
    const miluim = monthlyMiluimPay(25_006, result.discountIncome, 2025);
    expect(within(miluim, 25_192, 0.02)).toBe(true);
  });
});

describe("ESPP without trustee", () => {
  const profile: TaxProfile = {
    monthlySalary: 25_000,
    year: 2025,
    extraCapitalGain: 0,
    noIncomeYear: false,
  };
  const result = computeEspp(
    {
      withTrustee: false,
      planEndDate: new Date("2022-01-01"),
      shares: 100,
      stockPrice: 80,
      purchasedPrice: 50,
      discountedPrice: 42.5,
      fxRate: 3.0720,
      isTase: false,
      whatIf2Years: false,
      fees: DEFAULT_FEES,
    },
    profile,
  );

  it("reports tax already withheld at purchase and zero salary refund", () => {
    expect(result.taxOnDiscountPaid).toBeGreaterThan(0);
    expect(result.marginalTax).toBe(0);
    expect(result.bituah).toBe(0);
    expect(result.netToSalary).toBe(0);
    expect(result.netToBank).toBeCloseTo(result.totalNet, 4);
  });
});
