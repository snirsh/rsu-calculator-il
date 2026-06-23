import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import {
  computeEspp,
  monthlyMaternityPay,
  monthlyMiluimPay,
  type EsppResult,
  type TaxProfile,
} from "../lib/tax";
import { fetchQuote } from "../lib/market/quote";
import { ils, money, num, pct, todayIso } from "../lib/format";
import type { Settings } from "./GlobalInputs";
import { SymbolInput } from "./SymbolInput";
import { EMPTY_FEES, FeeEditor, resolveFees, type FeeOverrides } from "./FeeEditor";
import { Field, NumberInput, ResultRow, Toggle } from "./ui";

export interface EsppState {
  withTrustee: boolean;
  planEndDate: string;
  symbol: string;
  shares: number | "";
  setPrice: boolean;
  priceOverride: number | "";
  purchasedPrice: number | "";
  discountedPrice: number | "";
  fxAtPurchase: number | "";
  whatIf2Years: boolean;
  fees: FeeOverrides;
  livePrice: number | null;
  isTase: boolean;
  currency: string;
  loading: boolean;
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
}: {
  settings: Settings;
  fx: number;
  plan: EsppState;
  setPlan: Dispatch<SetStateAction<EsppState>>;
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
    const discounted = Number(plan.discountedPrice) || 0;
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

  return (
    <div className="calculator">
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
          <Field label={`Discounted price (${cur})`} help="Price you actually paid per share (e.g. Purchased × 0.85 for 15% off).">
            <NumberInput value={plan.discountedPrice} onChange={(v) => update({ discountedPrice: v })} min={0} step={0.0001} />
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

        {result ? (
          <EsppResults result={result} cur={cur} effPrice={effPrice} fx={fx} showInUsd={showInUsd} settings={settings} />
        ) : null}
      </section>
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

  return (
    <div className="results">
      <h3>Results</h3>
      {cur === "USD" ? <ResultRow label="USD → ILS" value={`1$ = ${num(fx, 4)}₪`} /> : null}
      <ResultRow label="Stock price" value={money(effPrice, cur)} />
      <ResultRow label="Gross" help="Sale value before tax: price × shares × fx." value={ils(result.gross)}>
        <ResultRow label="Foreign fee" value={ils(result.fees.foreign)} />
        <ResultRow label="Service fee" value={ils(result.fees.service)} />
        <ResultRow label="After-fee gross" value={ils(result.fees.afterFeeGross)} />
      </ResultRow>
      <ResultRow label="Gross investment" help="What you paid: discounted price × shares × purchase-day fx." value={ils(result.grossInvestment)} />
      <ResultRow label={isLoss ? "Gross loss" : "Gross gain"} value={ils(Math.abs(result.grossGain))} />
      <ResultRow label="Average tax deduction" help="(gross gain − net gain) ÷ gross gain. 0% on a loss." value={pct(result.averageTaxRate)} />

      {result.withTrustee ? (
        <>
          <ResultRow label="Marginal tax" help="Income tax on the discount at your bracket." value={ils(result.marginalTax)} />
          <ResultRow label="Bituah Leumi & health" help="National insurance + health on the discount, up to the ceiling." value={ils(result.bituah)} />
        </>
      ) : (
        <ResultRow label="Tax on discount (paid)" help="Marginal + Bituah Leumi withheld at the moment of purchase." value={ils(result.taxOnDiscountPaid)} />
      )}

      <ResultRow label="Capital tax" help="Capital-gains tax on the gain above the purchase price." value={ils(result.capitalTax)}>
        <ResultRow label="Shekel method gain" value={ils(result.capitalMethods.shekel)} />
        <ResultRow label="Dollar method gain" value={ils(result.capitalMethods.dollar)} />
        <ResultRow label="Taxed basis (lower)" value={ils(result.capitalMethods.basis)} />
      </ResultRow>

      <ResultRow label="Total net" help="The full amount you walk away with after the cycle." value={ils(result.totalNet)} />
      <ResultRow
        label={result.surtax < 0 ? "Magen Mas" : "Surtax owed"}
        help="Additional 3%/5% surtax based on annual income; negative means a loss available against future tax."
        value={ils(Math.abs(result.surtax))}
      />
      <ResultRow label={result.netGain < 0 ? "Net loss" : "Net gain"} help="Total net minus your gross investment — the actual profit on your ESPP money." value={ils(Math.abs(result.netGain))} />

      {result.withTrustee ? (
        <>
          <ResultRow label="Net to bank" help="Your trustee transfers this within ~10 days of the sale." value={money(bankVal, bankCur)} emphasis />
          <ResultRow label="Net to salary" help="Income-tax difference returned via salary, or claimable as a refund." value={ils(result.netToSalary)} />
        </>
      ) : (
        <ResultRow label="Net to bank" help="Equals total net." value={money(bankVal, bankCur)} emphasis />
      )}

      <div className="tips">
        <h3>Selling tips</h3>
        <ResultRow label="Monthly miluim pay (gross)" value={ils(monthlyMiluimPay(salary, result.discountIncome, settings.year))} />
        <ResultRow label="Monthly maternity pay (gross)" value={ils(monthlyMaternityPay(salary, result.discountIncome, settings.year))} />
      </div>
    </div>
  );
}
