import { describe, expect, it } from "vitest";
import { bituahOnExtra, bituahOnMonthlySlice } from "../bituah";
import { surtax } from "../surtax";
import { computeFees } from "../fees";
import { yearConstants, DEFAULT_FEES } from "../constants";

const yc = yearConstants(2025);

describe("bituah", () => {
  it("charges the full rate above the reduced threshold, below the ceiling", () => {
    // A monthly slice fully inside the full-rate tier.
    expect(bituahOnMonthlySlice(20_000, 5_000, yc)).toBeCloseTo(5_000 * 0.12, 4);
  });

  it("stops at the monthly ceiling", () => {
    const slice = bituahOnMonthlySlice(yc.bituah.ceilingMonthly, 10_000, yc);
    expect(slice).toBe(0);
  });

  it("spreads annual income across 12 months", () => {
    // 120k spread = 10k/month on top of a 20k salary → all full rate.
    expect(bituahOnExtra(20_000, 120_000, yc)).toBeCloseTo(120_000 * 0.12, 2);
  });

  it("applies the reduced rate at low salary", () => {
    // Salary 0, 1,000/month slice sits entirely in the reduced tier.
    expect(bituahOnMonthlySlice(0, 1_000, yc)).toBeCloseTo(1_000 * 0.035, 4);
  });
});

describe("surtax", () => {
  it("is zero below the threshold", () => {
    expect(
      surtax({ ordinaryIncome: 50_000, capitalIncome: 0, baseAnnualIncome: 300_000, extraCapitalGain: 0 }, yc),
    ).toBe(0);
  });

  it("charges 3% on ordinary income above the threshold", () => {
    const r = surtax(
      { ordinaryIncome: 100_000, capitalIncome: 0, baseAnnualIncome: 700_000, extraCapitalGain: 0 },
      yc,
    );
    const excess = 800_000 - yc.surtax.thresholdAnnual;
    expect(r).toBeCloseTo(excess * 0.03, 2);
  });

  it("adds the extra capital rate on the capital slice of the excess", () => {
    const r = surtax(
      { ordinaryIncome: 0, capitalIncome: 200_000, baseAnnualIncome: 700_000, extraCapitalGain: 0 },
      yc,
    );
    const excess = 900_000 - yc.surtax.thresholdAnnual;
    expect(r).toBeCloseTo(excess * (0.03 + 0.02), 2);
  });

  it("returns a negative Magen Mas figure for a net capital loss", () => {
    const r = surtax(
      { ordinaryIncome: 0, capitalIncome: -50_000, baseAnnualIncome: 0, extraCapitalGain: 0 },
      yc,
    );
    expect(r).toBeLessThan(0);
  });
});

describe("fees", () => {
  it("computes percentage and flat fees", () => {
    const f = computeFees(100_000, DEFAULT_FEES);
    expect(f.foreign).toBeCloseTo(100_000 * DEFAULT_FEES.foreignFee, 6);
    expect(f.service).toBeCloseTo(100_000 * DEFAULT_FEES.serviceFee, 6);
    expect(f.wire).toBe(DEFAULT_FEES.wireFee);
    expect(f.afterFeeGross).toBeCloseTo(100_000 - f.foreign - f.service, 6);
    expect(f.total).toBeCloseTo(f.foreign + f.service + f.wire, 6);
  });
});
