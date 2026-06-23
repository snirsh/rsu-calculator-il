import { useEffect, useMemo, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  combineRsuGrants,
  computeRsuGrant,
  monthlyMaternityPay,
  monthlyMiluimPay,
  type RsuGrantResult,
  type TaxProfile,
} from "../lib/tax";
import { fetchGrantPrice, fetchQuote } from "../lib/market/quote";
import { ils, money, num, pct, signTone, todayIso } from "../lib/format";
import type { Settings } from "./GlobalInputs";
import { SymbolInput } from "./SymbolInput";
import {
  EMPTY_FEES,
  FeeEditor,
  resolveFees,
  type FeeOverrides,
} from "./FeeEditor";
import { AnimatedValue, EmptyResults, Field, NumberInput, ResultRow, Toggle } from "./ui";
import { BreakdownBar } from "./Breakdown";

interface Grant {
  id: string;
  symbol: string;
  shares: number | "";
  grantDate: string;
  setPrice: boolean;
  priceOverride: number | "";
  grantPriceOverride: number | "";
  changedWorkplace: boolean;
  previousSalary: number | "";
  whatIf2Years: boolean;
  fees: FeeOverrides;
  // Market data (fetched).
  livePrice: number | null;
  grantPriceLive: number | null;
  isTase: boolean;
  currency: string;
  loading: boolean;
}

function newGrant(): Grant {
  return {
    id: crypto.randomUUID(),
    symbol: "",
    shares: 100,
    grantDate: "2023-01-01",
    setPrice: false,
    priceOverride: "",
    grantPriceOverride: "",
    changedWorkplace: false,
    previousSalary: "",
    whatIf2Years: false,
    fees: { ...EMPTY_FEES },
    livePrice: null,
    grantPriceLive: null,
    isTase: false,
    currency: "USD",
    loading: false,
  };
}

const MAX_GRANTS = 8;

export function RsuCalculator({
  settings,
  fx,
  grants,
  setGrants,
  globalInputs,
}: {
  settings: Settings;
  fx: number;
  grants: Grant[];
  setGrants: Dispatch<SetStateAction<Grant[]>>;
  globalInputs: ReactNode;
}) {
  const update = (id: string, patch: Partial<Grant>) =>
    setGrants((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  const profile: TaxProfile = {
    monthlySalary: settings.noIncomeYear ? 0 : Number(settings.monthlySalary) || 0,
    year: settings.year,
    extraCapitalGain: Number(settings.extraCapitalGain) || 0,
    noIncomeYear: settings.noIncomeYear,
  };

  const allTase = grants.length > 0 && grants.every((g) => g.isTase);
  const showInUsd = settings.saleInDollars && !allTase;

  const results = useMemo(
    () =>
      grants.map((g) => {
        const price = g.setPrice ? Number(g.priceOverride) : g.livePrice ?? 0;
        const grantPrice =
          g.grantPriceOverride !== ""
            ? Number(g.grantPriceOverride)
            : g.grantPriceLive ?? price;
        const shares = Number(g.shares) || 0;
        if (shares <= 0 || price <= 0) return null;
        const workplaceSalary =
          g.changedWorkplace || settings.noIncomeYear
            ? Number(g.previousSalary) || 0
            : Number(settings.monthlySalary) || 0;
        const res = computeRsuGrant(
          {
            shares,
            stockPrice: price,
            grantPrice,
            grantDate: new Date(g.grantDate),
            fxRate: fx,
            isTase: g.isTase,
            whatIf2Years: g.whatIf2Years,
            workplaceMonthlySalary: workplaceSalary,
            fees: resolveFees(g.fees),
          },
          profile,
        );
        return { ...res, isRefund: g.changedWorkplace } as RsuGrantResult;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grants, settings, fx],
  );

  const valid = results.filter((r): r is RsuGrantResult => r !== null);
  const combined = valid.length > 0 ? combineRsuGrants(valid, profile) : null;
  const incomePortion = valid.reduce((a, r) => a + r.incomePortion, 0);
  const anyRefund = grants.some((g) => g.changedWorkplace);

  return (
    <div className="layout">
      <div className="inputs-col">
        {globalInputs}
        {grants.map((g, i) => (
          <GrantCard
            key={g.id}
            index={i}
            grant={g}
            onChange={(patch) => update(g.id, patch)}
            onRemove={
              grants.length > 1 ? () => setGrants(grants.filter((x) => x.id !== g.id)) : undefined
            }
          />
        ))}

        {grants.length < MAX_GRANTS ? (
          <button
            type="button"
            className="add-grant"
            onClick={() => setGrants([...grants, newGrant()])}
          >
            + Add another grant
          </button>
        ) : null}
      </div>

      <div className="results-col">
        {valid.length === 0 ? (
          <EmptyResults />
        ) : (
          <>
            {grants.map((g, i) =>
              results[i] ? (
                <section className="panel results-panel" key={g.id}>
                  {grants.length > 1 ? <h2>RSU grant {i + 1}</h2> : null}
                  <GrantResults result={results[i]!} grant={g} fx={fx} showInUsd={showInUsd} />
                </section>
              ) : null,
            )}

            {combined && grants.length === 1 ? (
              <section className="panel results-panel">
                <SellingTips incomePortion={incomePortion} settings={settings} />
              </section>
            ) : null}

            {combined && grants.length > 1 ? (
              <section className="panel results-panel">
                <h2>Combined total</h2>
                <BreakdownBar
            segments={[
              { label: "Net", value: combined.totalNet, tone: "net" },
              { label: "Income", value: combined.marginalTax, tone: "income" },
              { label: "Bituah", value: combined.bituah, tone: "bituah" },
              { label: "Capital", value: combined.capitalTax, tone: "capital" },
              { label: "Fees", value: combined.gross - combined.totalNet - combined.marginalTax - combined.bituah - combined.capitalTax, tone: "fees" },
            ]}
          />
          <ResultRow label="Gross" value={<AnimatedValue value={combined.gross} format={ils} />} />
          <ResultRow
            label="Average tax deduction"
            help="Total tax ÷ gross across all grants."
            value={<AnimatedValue value={combined.averageTaxRate} format={pct} />}
          />
          <ResultRow label="Marginal tax" value={<AnimatedValue value={combined.marginalTax} format={ils} />} tone="income" />
          <ResultRow label="Bituah Leumi & health" value={<AnimatedValue value={combined.bituah} format={ils} />} tone="bituah" />
          <ResultRow label="Capital tax" value={<AnimatedValue value={combined.capitalTax} format={ils} />} tone="capital" />
          <ResultRow label="Total net" value={<AnimatedValue value={combined.totalNet} format={ils} />} tone="net" />
          <ResultRow
            label="Net to bank"
            value={<AnimatedValue value={combined.netToBank / (showInUsd ? fx : 1)} format={(n) => money(n, showInUsd ? "USD" : "ILS")} />}
            emphasis
          />
          <ResultRow
            label={anyRefund ? "Net tax refund" : "Net to salary"}
            value={<AnimatedValue value={combined.netToSalary} format={ils} />}
            tone={signTone(combined.netToSalary)}
          />
          <ResultRow
            label={combined.surtax < 0 ? "Magen Mas" : "Surtax owed"}
            help="Additional 3%/5% surtax based on annual income; negative means a loss available against future tax."
            value={<AnimatedValue value={Math.abs(combined.surtax)} format={ils} />}
            tone={combined.surtax > 0 ? "neg" : combined.surtax < 0 ? "pos" : undefined}
          />
          <SellingTips incomePortion={incomePortion} settings={settings} />
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function GrantCard({
  index,
  grant,
  onChange,
  onRemove,
}: {
  index: number;
  grant: Grant;
  onChange: (patch: Partial<Grant>) => void;
  onRemove?: () => void;
}) {
  // Fetch the live quote when the symbol changes.
  useEffect(() => {
    const sym = grant.symbol.trim();
    if (!sym) return;
    let active = true;
    onChange({ loading: true });
    fetchQuote(sym).then((q) => {
      if (!active) return;
      if (q) onChange({ livePrice: q.price, isTase: q.isTase, currency: q.currency, loading: false });
      else onChange({ loading: false });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grant.symbol]);

  // Fetch the grant-date 30-day average when symbol or grant date changes.
  useEffect(() => {
    const sym = grant.symbol.trim();
    if (!sym || !grant.grantDate) return;
    let active = true;
    fetchGrantPrice(sym, new Date(grant.grantDate)).then((p) => {
      if (active && p) onChange({ grantPriceLive: p });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grant.symbol, grant.grantDate]);

  const cur = grant.isTase ? "ILS" : "USD";
  const effPrice = grant.setPrice ? Number(grant.priceOverride) : grant.livePrice;

  return (
    <section className="panel grant">
      <div className="grant-head">
        <h2>RSU grant {index + 1}</h2>
        {onRemove ? (
          <button type="button" className="remove" onClick={onRemove} aria-label="Remove grant">
            ✕
          </button>
        ) : null}
      </div>

      <div className="grid">
        <Field label="Stock symbol" help="NASDAQ/NYSE ticker. For Tel Aviv listings add .TA (e.g. POLI.TA).">
          <SymbolInput
            value={grant.symbol}
            onChange={(v) => onChange({ symbol: v })}
            onPick={(v) => onChange({ symbol: v })}
          />
        </Field>
        <Field label="Number of shares" help="How many shares from this grant you intend to sell (at least 1).">
          <NumberInput value={grant.shares} onChange={(v) => onChange({ shares: v })} min={1} step={1} />
        </Field>
        <Field label="Grant date" help="The date your shares were granted (not the vesting date).">
          <input type="date" value={grant.grantDate} max={todayIso()} onChange={(e) => onChange({ grantDate: e.target.value })} />
        </Field>
      </div>

      <Toggle
        label="Set stock price"
        help="Off: live market price is used. On: override with your own number for what-if scenarios."
        checked={grant.setPrice}
        onChange={(v) => onChange({ setPrice: v })}
      />
      {grant.setPrice ? (
        <Field label={`Stock price (${cur})`}>
          <NumberInput value={grant.priceOverride} onChange={(v) => onChange({ priceOverride: v })} min={0} step={0.0001} />
        </Field>
      ) : (
        <p className="muted">
          {grant.loading
            ? "Fetching price…"
            : effPrice
              ? `Live price: ${money(effPrice, cur)}`
              : "Enter a symbol, or turn on “Set stock price”."}
        </p>
      )}

      <Field label={`Grant price (${cur}) — optional override`} help="Average price over the 30 working days before the grant date. Auto-filled from history when available.">
        <NumberInput
          value={grant.grantPriceOverride}
          onChange={(v) => onChange({ grantPriceOverride: v })}
          min={0}
          step={0.0001}
          placeholder={grant.grantPriceLive ? num(grant.grantPriceLive, 4) : "auto"}
        />
      </Field>

      <Toggle
        label="Changed workplace"
        help="Tick if you left the workplace that issued this grant. Used to compute Bituah Leumi from the salary you had there."
        checked={grant.changedWorkplace}
        onChange={(v) => onChange({ changedWorkplace: v })}
      />
      {grant.changedWorkplace ? (
        <Field label="Previous salary (₪)" help="The gross monthly salary you earned at the grant workplace.">
          <NumberInput value={grant.previousSalary} onChange={(v) => onChange({ previousSalary: v })} min={0} step={500} />
        </Field>
      ) : null}

      <Toggle
        label="What if 2 years pass?"
        help="Apply the 2-year capital-gains rule even if 2 years haven't passed since the grant date."
        checked={grant.whatIf2Years}
        onChange={(v) => onChange({ whatIf2Years: v })}
      />

      <FeeEditor value={grant.fees} onChange={(fees) => onChange({ fees })} />
    </section>
  );
}

function GrantResults({
  result,
  grant,
  fx,
  showInUsd,
}: {
  result: RsuGrantResult;
  grant: Grant;
  fx: number;
  showInUsd: boolean;
}) {
  const cur = grant.isTase ? "ILS" : "USD";
  const effPrice = grant.setPrice ? Number(grant.priceOverride) : grant.livePrice ?? 0;
  const grantPrice =
    grant.grantPriceOverride !== "" ? Number(grant.grantPriceOverride) : grant.grantPriceLive ?? effPrice;
  const bankCur = showInUsd ? "USD" : "ILS";
  const bankVal = showInUsd ? result.netToBank / fx : result.netToBank;

  const feesShare =
    result.gross - result.totalNet - result.marginalTax - result.bituah - result.capitalTax;

  return (
    <div className="results">
      <h3>Results</h3>
      <BreakdownBar
        segments={[
          { label: "Net", value: result.totalNet, tone: "net" },
          { label: "Income", value: result.marginalTax, tone: "income" },
          { label: "Bituah", value: result.bituah, tone: "bituah" },
          { label: "Capital", value: result.capitalTax, tone: "capital" },
          { label: "Fees", value: feesShare, tone: "fees" },
        ]}
      />
      {!grant.isTase ? <ResultRow label="USD → ILS" value={`1$ = ${num(fx, 4)}₪`} /> : null}
      <ResultRow label="Stock price" value={<AnimatedValue value={effPrice} format={(n) => money(n, cur)} />} />
      <ResultRow label="Grant price" help="30-working-day average before the grant date — the income/capital split basis." value={<AnimatedValue value={grantPrice} format={(n) => money(n, cur)} />} />
      <ResultRow label="Gross" help="Sale value before tax: price × shares × fx." value={<AnimatedValue value={result.gross} format={ils} />}>
        <ResultRow label="Foreign fee" value={<AnimatedValue value={result.fees.foreign} format={ils} />} />
        <ResultRow label="Service fee" value={<AnimatedValue value={result.fees.service} format={ils} />} />
        <ResultRow label="After-fee gross" value={<AnimatedValue value={result.fees.afterFeeGross} format={ils} />} />
      </ResultRow>
      <ResultRow label="Average tax deduction" help="Total tax ÷ gross." value={<AnimatedValue value={result.averageTaxRate} format={pct} />} />
      <ResultRow label="Marginal tax" help="Income tax on the revenue portion at your bracket." value={<AnimatedValue value={result.marginalTax} format={ils} />} tone="income" />
      <ResultRow label="Bituah Leumi & health" help="National insurance + health on the income portion, up to the ceiling." value={<AnimatedValue value={result.bituah} format={ils} />} tone="bituah" />
      <ResultRow label="Capital tax" help="Capital-gains tax on the capital portion (if 2 years passed)." value={<AnimatedValue value={result.capitalTax} format={ils} />} tone="capital" />
      <ResultRow label="Total net" help="Gross − fees − taxes." value={<AnimatedValue value={result.totalNet} format={ils} />} tone="net" />
      <ResultRow label="Net to bank" help="Amount that hits your bank on the sale day." value={<AnimatedValue value={bankVal} format={(n) => money(n, bankCur)} />} emphasis>
        <ResultRow label="Wire fee" value={<AnimatedValue value={showInUsd ? result.fees.wire / fx : result.fees.wire} format={(n) => money(n, bankCur)} />} />
      </ResultRow>
      <ResultRow
        label={result.isRefund ? "Net tax refund" : "Net to salary"}
        help="Income-tax difference returned via salary, or claimable as a refund if you left the employer."
        value={<AnimatedValue value={result.netToSalary} format={ils} />}
        tone={signTone(result.netToSalary)}
      />
      {result.breakEvenPrice2y !== null ? (
        <ResultRow
          label="2 years break-even stock price"
          help="The future price where waiting to the 2-year mark yields the same net as selling now."
          value={<AnimatedValue value={result.breakEvenPrice2y} format={(n) => money(n, cur)} />}
        />
      ) : null}
    </div>
  );
}

function SellingTips({
  incomePortion,
  settings,
}: {
  incomePortion: number;
  settings: Settings;
}) {
  const salary = settings.noIncomeYear ? 0 : Number(settings.monthlySalary) || 0;
  const miluim = monthlyMiluimPay(salary, incomePortion, settings.year);
  const maternity = monthlyMaternityPay(salary, incomePortion, settings.year);
  return (
    <div className="tips">
      <h3>Selling tips</h3>
      <ResultRow label="Monthly miluim pay (gross)" help="Gross monthly reserve-duty pay. Bituah Leumi bases it on your income in the 3 months before the call-up, so a one-time sale lifts it by the income portion ÷ 3 (capped at the NI ceiling)." value={<AnimatedValue value={miluim} format={ils} />} />
      <ResultRow label="Monthly maternity pay (gross)" help="Gross monthly maternity pay; full 105-day entitlement is this × 3.5." value={<AnimatedValue value={maternity} format={ils} />} />
    </div>
  );
}

export { newGrant };
export type { Grant };
