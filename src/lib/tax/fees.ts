import type { SaleFees } from "./types";

export interface FeeBreakdown {
  foreign: number;
  service: number;
  /** Trade value after percentage fees but before the flat wire fee. */
  afterFeeGross: number;
  wire: number;
  /** Total of all fees in the same currency as `tradeValue`. */
  total: number;
}

/**
 * Percentage + flat fees on a sale. `tradeValue` and the returned amounts are in
 * the sale currency (ILS for TASE listings, otherwise whatever the caller uses).
 * The conversion fee is handled separately by the caller because it only applies
 * when converting USD→ILS.
 */
export function computeFees(tradeValue: number, fees: SaleFees): FeeBreakdown {
  const foreign = tradeValue * fees.foreignFee;
  const service = tradeValue * fees.serviceFee;
  const afterFeeGross = tradeValue - foreign - service;
  const wire = fees.wireFee;
  return {
    foreign,
    service,
    afterFeeGross,
    wire,
    total: foreign + service + wire,
  };
}
