import { describe, expect, it } from "vitest";
import { annualIncomeTax, marginalIncomeTax, marginalRateAt } from "../income";
import { yearConstants } from "../constants";

const yc = yearConstants(2025);

describe("annualIncomeTax", () => {
  it("is zero for non-positive income", () => {
    expect(annualIncomeTax(0, yc)).toBe(0);
    expect(annualIncomeTax(-100, yc)).toBe(0);
  });

  it("taxes the first bracket at 10%", () => {
    expect(annualIncomeTax(50_000, yc)).toBeCloseTo(5_000, 2);
  });

  it("stacks across brackets", () => {
    // 84,120 @10% + (120,720-84,120) @14%
    const expected = 84_120 * 0.1 + (120_720 - 84_120) * 0.14;
    expect(annualIncomeTax(120_720, yc)).toBeCloseTo(expected, 2);
  });
});

describe("marginalIncomeTax", () => {
  it("returns incremental tax on a slice above the base", () => {
    const base = 200_000;
    const extra = 50_000;
    expect(marginalIncomeTax(base, extra, yc)).toBeCloseTo(
      annualIncomeTax(base + extra, yc) - annualIncomeTax(base, yc),
      6,
    );
  });

  it("is zero for non-positive extra", () => {
    expect(marginalIncomeTax(100_000, 0, yc)).toBe(0);
  });
});

describe("marginalRateAt", () => {
  it("returns the bracket rate at the income level", () => {
    expect(marginalRateAt(50_000, yc)).toBe(0.1);
    expect(marginalRateAt(300_000, yc)).toBe(0.35);
    expect(marginalRateAt(1_000_000, yc)).toBe(0.5);
  });
});
