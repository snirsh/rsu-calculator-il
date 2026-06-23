import { describe, expect, it } from "vitest";
import { computeRsuGrant } from "../rsu";
import { computeEspp } from "../espp";
import { DEFAULT_FEES } from "../constants";
import { monthlyMiluimPay, monthlyMaternityPay } from "../sellingTips";
import type { TaxProfile } from "../types";

// ---------------------------------------------------------------------------
// Worked examples derived from first principles.
//
// These fixtures are constructed independently from the published Israeli
// statutory rates encoded in `constants.ts` (Income Tax Ordinance brackets,
// Bituah Leumi employee rates, the Section 102 capital-gains rate). The inputs
// are deliberately round numbers chosen so every expected figure can be
// hand-derived from those public rates — each `it` block shows the arithmetic.
//
// Two kinds of assertion:
//   - Definitional identities that must hold by construction (gross = price ×
//     shares × fx; net-to-bank + net-to-salary = total net; etc.).
//   - Statutory figures computed by hand from the public brackets/rates.
//
// Nothing here is taken from any third-party calculator's output.
// ---------------------------------------------------------------------------

describe("RSU worked example (100 shares, sold before the 2-year mark)", () => {
  const asOf = new Date("2026-06-23");
  const profile: TaxProfile = {
    monthlySalary: 30_000, // ⇒ 360,000 annual salary, sitting in the 35% bracket
    year: 2025,
    extraCapitalGain: 0,
    noIncomeYear: false,
  };
  const result = computeRsuGrant(
    {
      shares: 100,
      stockPrice: 200, // USD
      grantPrice: 150, // USD
      grantDate: new Date("2025-09-01"), // < 2 years before asOf ⇒ not qualified
      fxRate: 3.5,
      isTase: false,
      whatIf2Years: false,
      workplaceMonthlySalary: 30_000,
      fees: DEFAULT_FEES,
    },
    profile,
    asOf,
  );

  it("gross = price × shares × fx = 200 × 100 × 3.5 = ₪70,000", () => {
    expect(result.gross).toBeCloseTo(70_000, 2);
  });

  it("no capital track before 2 years ⇒ whole benefit is ordinary income", () => {
    expect(result.qualified).toBe(false);
    expect(result.capitalPortion).toBe(0);
    expect(result.capitalTax).toBe(0);
    expect(result.incomePortion).toBeCloseTo(70_000, 2);
  });

  it("marginal tax = ₪70,000 × 35% = ₪24,500 (salary already in the 35% band)", () => {
    // 360,000 and 430,000 both fall inside the 269,280–560,280 bracket (35%),
    // so the full extra 70,000 is taxed at 35%.
    expect(result.marginalTax).toBeCloseTo(24_500, 2);
  });

  it("Bituah Leumi & health = ₪70,000 × 12% = ₪8,400", () => {
    // Spread over 12 months on top of a 30,000 salary, every monthly slice is in
    // the full-rate (12%) tier and below the 50,695 monthly ceiling.
    expect(result.bituah).toBeCloseTo(8_400, 2);
  });

  it("average tax rate = (24,500 + 8,400) / 70,000 = 47%", () => {
    expect(result.averageTaxRate).toBeCloseTo(result.totalTax / result.gross, 6);
    expect(result.averageTaxRate).toBeCloseTo(0.47, 6);
  });

  it("fees = (0.07% + 0.60%) × 20,000 + $20 wire, in ILS = ₪539", () => {
    // foreign 14 + service 120 + wire 20 = $154; × 3.5 = ₪539.
    expect(result.fees.total).toBeCloseTo(539, 2);
  });

  it("net to bank = ₪26,061 (gross − fees − bituah − top-rate withholding)", () => {
    // 70,000 − 539 − 8,400 − (70,000 × 50%) = 26,061.
    expect(result.netToBank).toBeCloseTo(26_061, 2);
  });

  it("net to salary = top-rate withholding − real marginal = 35,000 − 24,500 = ₪10,500", () => {
    expect(result.netToSalary).toBeCloseTo(10_500, 2);
  });

  it("net to bank + net to salary reconstitute total net (₪36,561)", () => {
    expect(result.totalNet).toBeCloseTo(36_561, 2);
    expect(result.netToBank + result.netToSalary).toBeCloseTo(result.totalNet, 4);
  });

  it("2-year break-even price = ₪48,181 / 260.155 ≈ $185.20", () => {
    // Baseline: selling now is NOT qualified, so the whole benefit is ordinary
    // income and the net is ₪36,561 (= net-to-bank + net-to-salary above).
    //
    // A qualified sale at a future price P (grant price still $150) nets, in ILS:
    //   gross           = 350·P
    //   fees            = (0.07%·100P + 0.60%·100P + $20)·3.5 = 2.345·P + 70
    //   income portion  = 150·100·3.5 = 52,500  ⇒ marginal 35% = 18,375
    //                                            ⇒ bituah  12% =  6,300
    //   capital portion = 350·P − 52,500         ⇒ capital 25% = 87.5·P − 13,125
    //   net(P) = 350P − (2.345P + 70) − (18,375 + 6,300 + 87.5P − 13,125)
    //          = 260.155·P − 11,620
    // Setting net(P) = 36,561 gives P = 48,181 / 260.155 ≈ 185.2011.
    //
    // (Regression guard: a past bug computed the baseline as if it were already
    // qualified, collapsing the break-even onto the current price of $200.)
    expect(result.breakEvenPrice2y).not.toBeNull();
    expect(result.breakEvenPrice2y!).toBeCloseTo(48_181 / 260.155, 4);

    // By construction, a qualified sale at the break-even price nets exactly the
    // non-qualified "sell now" total.
    const atBreakEven = computeRsuGrant(
      {
        shares: 100,
        stockPrice: result.breakEvenPrice2y!,
        grantPrice: 150,
        grantDate: new Date("2025-09-01"),
        fxRate: 3.5,
        isTase: false,
        whatIf2Years: true,
        workplaceMonthlySalary: 30_000,
        fees: DEFAULT_FEES,
      },
      profile,
      asOf,
    );
    expect(atBreakEven.totalNet).toBeCloseTo(result.totalNet, 2);
  });

  it("monthly miluim & maternity pay use the 3-month base, capped at the NI ceiling", () => {
    // Both benefits derive the daily rate from the 3 months before the event
    // (income / 90), so the monthly equivalent adds the one-time income portion
    // spread over those 3 months: 30,000 + 70,000/3 = ₪53,333.33 uncapped.
    // That exceeds the 2025 NI monthly ceiling (₪50,695), so the cap engages.
    const miluim = monthlyMiluimPay(30_000, result.incomePortion, 2025);
    const maternity = monthlyMaternityPay(30_000, result.incomePortion, 2025);
    expect(miluim).toBeCloseTo(50_695, 2);
    expect(miluim).toBeCloseTo(maternity, 6);

    // A smaller income portion stays below the ceiling and shows the /3 base
    // directly: 30,000 + 30,000/3 = ₪40,000.
    expect(monthlyMiluimPay(30_000, 30_000, 2025)).toBeCloseTo(40_000, 2);
  });
});

describe("ESPP worked example (100 shares, with trustee, 2-year qualified)", () => {
  const asOf = new Date("2026-06-23");
  const profile: TaxProfile = {
    monthlySalary: 30_000, // ⇒ 360,000 annual salary, in the 35% bracket
    year: 2025,
    extraCapitalGain: 0,
    noIncomeYear: false,
  };
  const result = computeEspp(
    {
      withTrustee: true,
      planEndDate: new Date("2022-01-01"), // > 2 years before asOf ⇒ qualified
      shares: 100,
      stockPrice: 100, // USD, at sale
      purchasedPrice: 80, // USD, pre-discount reference
      discountedPrice: 68, // USD, 15% discount actually paid
      fxRate: 3.5, // sale-day USD→ILS
      fxRateAtPurchase: 4.0, // purchase-day USD→ILS
      isTase: false,
      whatIf2Years: false,
      fees: DEFAULT_FEES,
    },
    profile,
    asOf,
  );

  it("gross investment = discounted × shares × purchase fx = 68 × 100 × 4.0 = ₪27,200", () => {
    expect(result.grossInvestment).toBeCloseTo(27_200, 2);
  });

  it("gross = 100 × 100 × 3.5 = ₪35,000", () => {
    expect(result.gross).toBeCloseTo(35_000, 2);
  });

  it("discount income = (80 − 68) × 100 × 3.5 = ₪4,200; marginal = ×35% = ₪1,470", () => {
    expect(result.discountIncome).toBeCloseTo(4_200, 2);
    expect(result.marginalTax).toBeCloseTo(1_470, 2);
  });

  it("Bituah Leumi & health = ₪4,200 × 12% = ₪504", () => {
    expect(result.bituah).toBeCloseTo(504, 2);
  });

  it("capital basis is the lower of the two dual-currency gains (₪3,000)", () => {
    // Shekel gain = 35,000 − (80 × 100 × 4.0) = 3,000.
    // Dollar gain = (100 − 80) × 100 × 3.5 = 7,000. Lower = 3,000.
    expect(result.capitalMethods.shekel).toBeCloseTo(3_000, 2);
    expect(result.capitalMethods.dollar).toBeCloseTo(7_000, 2);
    expect(result.capitalMethods.basis).toBeCloseTo(3_000, 2);
  });

  it("capital tax = ₪3,000 × 25% = ₪750", () => {
    expect(result.capitalTax).toBeCloseTo(750, 2);
  });

  it("no surtax: total annual income (367,200) is below the ₪721,560 threshold", () => {
    expect(result.surtax).toBe(0);
  });

  it("total net = net gain + gross investment, and the bank/salary split reconstitutes it", () => {
    // 35,000 − 304.5 fees − 2,724 tax = 31,971.5 total net.
    expect(result.totalNet).toBeCloseTo(31_971.5, 2);
    expect(result.totalNet).toBeCloseTo(result.netGain + result.grossInvestment, 4);
    expect(result.netToBank + result.netToSalary).toBeCloseTo(result.totalNet, 4);
  });

  it("net to salary = top-rate withholding − marginal = 2,100 − 1,470 = ₪630", () => {
    expect(result.netToSalary).toBeCloseTo(630, 2);
  });
});

describe("ESPP without trustee (discount tax withheld at purchase)", () => {
  const profile: TaxProfile = {
    monthlySalary: 30_000,
    year: 2025,
    extraCapitalGain: 0,
    noIncomeYear: false,
  };
  const result = computeEspp(
    {
      withTrustee: false,
      planEndDate: new Date("2022-01-01"),
      shares: 100,
      stockPrice: 100,
      purchasedPrice: 80,
      discountedPrice: 68,
      fxRate: 3.5,
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
