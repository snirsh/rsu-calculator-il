import { useEffect, useMemo, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  computeEspp,
  monthlyMaternityPay,
  monthlyMiluimPay,
  type EsppResult,
  type TaxProfile,
} from "../lib/tax";
import { fetchQuote } from "../lib/market/quote";
import { ils, money, num, pct, signTone, todayIso } from "../lib/format";
import type { Settings } from "./GlobalInputs";
import { SymbolInput } from "./SymbolInput";
import { EMPTY_FEES, FeeEditor, resolveFees, type FeeOverrides } from "./FeeEditor";
import { AnimatedValue, EmptyResults, Field, NumberInput, ResultRow, Toggle } from "./ui";
import { BreakdownBar, type Segment } from "./Breakdown";

/** How the purchase discount is entered: a percentage off, or the exact price paid. */
export type DiscountMode = "percent" | "price";

export interface EsppState {
  withTrustee: boolean;
  planEndDate: string;
  symbol: string;
  shares: number | "";
  setPrice: boolean;
  priceOverride: number | "";
  purchasedPrice: number | "";
  /** How to express the discount, and the value for each mode. */
  discountMode: DiscountMode;
  discountPct: number | "";
  discountedPrice: number | "";
  fxAtPurchase: number | "";
  whatIf2Years: boolean;
  fees: FeeOverrides;
  livePrice: number | null;
  isTase: boolean;
  currency: string;
  loading: boolean;
}

/** The discounted price implied by the plan's current discount mode. */
export function esppDiscountedPrice(plan: EsppState): number {
  const purchased = Number(plan.purchasedPrice) || 0;
  if (plan.discountMode === "percent") {
    return purchased * (1 - (Number(plan.discountPct) || 0) / 100);
  }
  return Number(plan.discountedPrice) || 0;
}

export function newEspp(): EsppState {
  return {
    withTrustee: true,
    planEndDate: "2022-01-01",
    symbol: "",
    shares: 100,
    setPrice: false,
    priceOverride: "",
    purchasedPrice: 50,
    discountMode: "percent",
    discountPct: 15,
    discountedPrice: 42.5,
    fxAtPurchase: "",
    whatIf2Years: false,
    fees: { ...EMPTY_FEES },
    livePrice: null,
    isTase: false,
    currency: "USD",
    loading: false,
  };
}

export function EsppCalculator({
  settings,
  fx,
  plan,
  setPlan,
  globalInputs,
}: {
  settings: Settings;
  fx: number;
  plan: EsppState;
  setPlan: Dispatch<SetStateAction<EsppState>>;
  globalInputs: ReactNode;
}) {
  const update = (patch: Partial<EsppState>) => setPlan((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    const sym = plan.symbol.trim();
    if (!sym) return;
    let active = true;
    update({ loading: true });
    fetchQuote(sym).then((q) => {
      if (!active) return;
      if (q) update({ livePrice: q.price, isTase: q.isTase, currency: q.currency, loading: false });
      else update({ loading: false });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.symbol]);

  const profile: TaxProfile = {
    monthlySalary: settings.noIncomeYear ? 0 : Number(settings.monthlySalary) || 0,
    year: settings.year,
    extraCapitalGain: Number(settings.extraCapitalGain) || 0,
    noIncomeYear: settings.noIncomeYear,
  };

  const cur = plan.isTase ? "ILS" : "USD";
  const effPrice = plan.setPrice ? Number(plan.priceOverride) : plan.livePrice ?? 0;
  const showInUsd = settings.saleInDollars && !plan.isTase;

  const result = useMemo<EsppResult | null>(() => {
    const shares = Number(plan.shares) || 0;
    const purchased = Number(plan.purchasedPrice) || 0;
    const discounted = esppDiscountedPrice(plan);
    if (shares <= 0 || effPrice <= 0 || purchased <= 0 || discounted <= 0) return null;
    return computeEspp(
      {
        withTrustee: plan.withTrustee,
        planEndDate: new Date(plan.planEndDate),
        shares,
        stockPrice: effPrice,
        purchasedPrice: purchased,
        discountedPrice: discounted,
        fxRate: fx,
        fxRateAtPurchase: plan.fxAtPurchase === "" ? undefined : Number(plan.fxAtPurchase),
        isTase: plan.isTase,
        whatIf2Years: plan.whatIf2Years,
        fees: resolveFees(plan.fees),
      },
      profile,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, settings, fx]);

  // Show the counterpart of whichever discount mode is active, as a hint.
  const purchasedNum = Number(plan.purchasedPrice) || 0;
  const derivedDiscounted = esppDiscountedPrice(plan);
  const derivedPctOff = purchasedNum > 0 ? 1 - (Number(plan.discountedPrice) || 0) / purchasedNum : 0;

  return (
    <div className="layout">
      <div className="inputs-col">
        {globalInputs}
        <section className="panel grant">
        <h2>ESPP plan</h2>

        <Toggle
          label="With Trustee (102)"
          help="On: Section 102 ESPP held by a trustee — capital portion taxed at 25% if held > 2 years from plan end. Off: direct purchase, tax already withheld on the discount."
          checked={plan.withTrustee}
          onChange={(v) => update({ withTrustee: v })}
        />

        <div className="grid">
          <Field label="Stock symbol" help="Ticker; add .TA for Tel Aviv listings.">
            <SymbolInput value={plan.symbol} onChange={(v) => update({ symbol: v })} onPick={(v) => update({ symbol: v })} />
          </Field>
          <Field label="Number of shares">
            <NumberInput value={plan.shares} onChange={(v) => update({ shares: v })} min={1} step={1} />
          </Field>
          {plan.withTrustee ? (
            <Field label="Plan end date" help="Last day of the ESPP plan — starts the 2-year capital-gains clock.">
              <input type="date" value={plan.planEndDate} max={todayIso()} onChange={(e) => update({ planEndDate: e.target.value })} />
            </Field>
          ) : null}
        </div>

        <div className="grid">
          <Field label={`Purchased price (${cur})`} help="Stock price before the ESPP discount (usually the lower of offering-start and purchase-date price).">
            <NumberInput value={plan.purchasedPrice} onChange={(v) => update({ purchasedPrice: v })} min={0} step={0.0001} />
          </Field>
          <Field label="Discount" help="How your discount is expressed — a percentage off the purchased price, or the exact price you paid per share.">
            <div className="seg-switch" role="group" aria-label="Discount input mode">
              <button
                type="button"
                className={plan.discountMode === "percent" ? "active" : ""}
                aria-pressed={plan.discountMode === "percent"}
                onClick={() => update({ discountMode: "percent" })}
              >
                % off
              </button>
              <button
                type="button"
                className={plan.discountMode === "price" ? "active" : ""}
                aria-pressed={plan.discountMode === "price"}
                onClick={() => update({ discountMode: "price" })}
              >
                {cur} price
              </button>
            </div>
            {plan.discountMode === "percent" ? (
              <NumberInput value={plan.discountPct} onChange={(v) => update({ discountPct: v })} min={0} max={100} step={1} placeholder="15" />
            ) : (
              <NumberInput value={plan.discountedPrice} onChange={(v) => update({ discountedPrice: v })} min={0} step={0.0001} />
            )}
            {plan.discountMode === "percent" && purchasedNum > 0 && plan.discountPct !== "" ? (
              <span className="field-hint">= {money(derivedDiscounted, cur)} per share</span>
            ) : null}
            {plan.discountMode === "price" && purchasedNum > 0 && plan.discountedPrice !== "" ? (
              <span className="field-hint">= {pct(derivedPctOff)} off</span>
            ) : null}
          </Field>
          <Field label="USD/ILS rate at purchase" help="Exchange rate on the purchase day. Enables both dual-currency capital-gain methods. Leave blank if not needed.">
            <NumberInput value={plan.fxAtPurchase} onChange={(v) => update({ fxAtPurchase: v })} min={1} max={7} step={0.0001} placeholder="optional" />
          </Field>
        </div>

        <Toggle
          label="Set stock price"
          help="Off: live market price is used. On: override with your own number."
          checked={plan.setPrice}
          onChange={(v) => update({ setPrice: v })}
        />
        {plan.setPrice ? (
          <Field label={`Stock price (${cur})`}>
            <NumberInput value={plan.priceOverride} onChange={(v) => update({ priceOverride: v })} min={0} step={0.0001} />
          </Field>
        ) : (
          <p className="muted">
            {plan.loading ? "Fetching price…" : effPrice ? `Live price: ${money(effPrice, cur)}` : "Enter a symbol, or turn on “Set stock price”."}
          </p>
        )}

        {plan.withTrustee ? (
          <Toggle
            label="What if 2 years pass?"
            help="Apply the 2-year capital-gains rule even if it hasn't been reached yet."
            checked={plan.whatIf2Years}
            onChange={(v) => update({ whatIf2Years: v })}
          />
        ) : null}

        <FeeEditor value={plan.fees} onChange={(fees) => update({ fees })} />
        </section>
      </div>

      <div className="results-col">
        {result ? (
          <section className="panel results-panel">
            <EsppResults result={result} cur={cur} effPrice={effPrice} fx={fx} showInUsd={showInUsd} settings={settings} />
          </section>
        ) : (
          <EmptyResults />
        )}
      </div>
    </div>
  );
}

function EsppResults({
  result,
  cur,
  effPrice,
  fx,
  showInUsd,
  settings,
}: {
  result: EsppResult;
  cur: "ILS" | "USD";
  effPrice: number;
  fx: number;
  showInUsd: boolean;
  settings: Settings;
}) {
  const bankCur = showInUsd ? "USD" : "ILS";
  const bankVal = showInUsd ? result.netToBank / fx : result.netToBank;
  const isLoss = result.grossGain < 0;
  const salary = settings.noIncomeYear ? 0 : Number(settings.monthlySalary) || 0;
  const taxes = result.withTrustee
    ? result.marginalTax + result.bituah + result.capitalTax
    : result.taxOnDiscountPaid + result.capitalTax;
  const feesShare = result.gross - result.grossInvestment - result.netGain - taxes;

  const segments: Segment[] = [
    { label: isLoss ? "Loss" : "Gain", value: result.netGain, tone: isLoss ? "neg" : "net" },
    { label: "Investment", value: result.grossInvestment, tone: "invest" },
  ];
  if (result.withTrustee) {
    segments.push({ label: "Income", value: result.marginalTax, tone: "income" });
    segments.push({ label: "Bituah", value: result.bituah, tone: "bituah" });
  } else {
    segments.push({ label: "Discount", value: result.taxOnDiscountPaid, tone: "income" });
  }
  segments.push({ label: "Capital", value: result.capitalTax, tone: "capital" });
  segments.push({ label: "Fees", value: feesShare, tone: "fees" });

  return (
    <div className="results">
      <h3>Results</h3>
      <BreakdownBar segments={segments} />
      {cur === "USD" ? <ResultRow label="USD → ILS" value={`1$ = ${num(fx, 4)}₪`} /> : null}
      <ResultRow label="Stock price" value={<AnimatedValue value={effPrice} format={(n) => money(n, cur)} />} />
      <ResultRow label="Gross" help="Sale value before tax: price × shares × fx." value={<AnimatedValue value={result.gross} format={ils} />}>
        <ResultRow label="Foreign fee" value={<AnimatedValue value={result.fees.foreign} format={ils} />} />
        <ResultRow label="Service fee" value={<AnimatedValue value={result.fees.service} format={ils} />} />
        <ResultRow label="After-fee gross" value={<AnimatedValue value={result.fees.afterFeeGross} format={ils} />} />
      </ResultRow>
      <ResultRow label="Gross investment" help="What you paid: discounted price × shares × purchase-day fx." value={<AnimatedValue value={result.grossInvestment} format={ils} />} tone="invest" />
      <ResultRow label={isLoss ? "Gross loss" : "Gross gain"} value={<AnimatedValue value={Math.abs(result.grossGain)} format={ils} />} tone={signTone(result.grossGain)} />
      <ResultRow label="Average tax deduction" help="(gross gain − net gain) ÷ gross gain. 0% on a loss." value={<AnimatedValue value={result.averageTaxRate} format={pct} />} />

      {result.withTrustee ? (
        <>
          <ResultRow label="Marginal tax" help="Income tax on the discount at your bracket." value={<AnimatedValue value={result.marginalTax} format={ils} />} tone="income" />
          <ResultRow label="Bituah Leumi & health" help="National insurance + health on the discount, up to the ceiling." value={<AnimatedValue value={result.bituah} format={ils} />} tone="bituah" />
        </>
      ) : (
        <ResultRow label="Tax on discount (paid)" help="Marginal + Bituah Leumi withheld at the moment of purchase." value={<AnimatedValue value={result.taxOnDiscountPaid} format={ils} />} tone="income" />
      )}

      <ResultRow label="Capital tax" help="Capital-gains tax on the gain above the purchase price." value={<AnimatedValue value={result.capitalTax} format={ils} />} tone="capital">
        <ResultRow label="Shekel method gain" value={<AnimatedValue value={result.capitalMethods.shekel} format={ils} />} />
        <ResultRow label="Dollar method gain" value={<AnimatedValue value={result.capitalMethods.dollar} format={ils} />} />
        <ResultRow label="Taxed basis (lower)" value={<AnimatedValue value={result.capitalMethods.basis} format={ils} />} />
      </ResultRow>

      <ResultRow label="Total net" help="The full amount you walk away with after the cycle." value={<AnimatedValue value={result.totalNet} format={ils} />} tone="net" />
      <ResultRow
        label={result.surtax < 0 ? "Magen Mas" : "Surtax owed"}
        help="Additional 3%/5% surtax based on annual income; negative means a loss available against future tax."
        value={<AnimatedValue value={Math.abs(result.surtax)} format={ils} />}
        tone={result.surtax > 0 ? "neg" : result.surtax < 0 ? "pos" : undefined}
      />
      <ResultRow label={result.netGain < 0 ? "Net loss" : "Net gain"} help="Total net minus your gross investment — the actual profit on your ESPP money." value={<AnimatedValue value={Math.abs(result.netGain)} format={ils} />} tone={signTone(result.netGain)} />

      {result.withTrustee ? (
        <>
          <ResultRow label="Net to bank" help="Your trustee transfers this within ~10 days of the sale." value={<AnimatedValue value={bankVal} format={(n) => money(n, bankCur)} />} emphasis />
          <ResultRow label="Net to salary" help="Income-tax difference returned via salary, or claimable as a refund." value={<AnimatedValue value={result.netToSalary} format={ils} />} tone={signTone(result.netToSalary)} />
        </>
      ) : (
        <ResultRow label="Net to bank" help="Equals total net." value={<AnimatedValue value={bankVal} format={(n) => money(n, bankCur)} />} emphasis />
      )}

      <div className="tips">
        <h3>Selling tips</h3>
        <ResultRow label="Monthly miluim pay (gross)" value={<AnimatedValue value={monthlyMiluimPay(salary, result.discountIncome, settings.year)} format={ils} />} />
        <ResultRow label="Monthly maternity pay (gross)" value={<AnimatedValue value={monthlyMaternityPay(salary, result.discountIncome, settings.year)} format={ils} />} />
      </div>
    </div>
  );
}
