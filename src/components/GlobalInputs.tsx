import { SUPPORTED_YEARS } from "../lib/tax";
import { Field, NumberInput, Toggle } from "./ui";
import { num } from "../lib/format";

export interface Settings {
  monthlySalary: number | "";
  noIncomeYear: boolean;
  year: number;
  /** null ⇒ use the live market rate. */
  fxOverride: number | "" | null;
  extraCapitalGain: number | "";
  saleInDollars: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  monthlySalary: 25_000,
  noIncomeYear: false,
  year: SUPPORTED_YEARS[SUPPORTED_YEARS.length - 1],
  fxOverride: null,
  extraCapitalGain: 0,
  saleInDollars: false,
};

export function GlobalInputs({
  settings,
  onChange,
  fxLive,
  fxIsLive,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  fxLive: number;
  fxIsLive: boolean;
}) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <section className="panel">
      <h2>General inputs</h2>
      <div className="grid">
        <Field
          label="Average monthly salary (₪)"
          help="Gross monthly average — base + benefits + bonus, plus any RSU income spread over the year. Use a 12-month average; enter 0 if you didn't work this year."
        >
          <NumberInput
            value={settings.noIncomeYear ? 0 : settings.monthlySalary}
            onChange={(v) => set("monthlySalary", v)}
            min={0}
            step={500}
          />
        </Field>

        <Field label="Tax year" help="Which year's brackets, Bituah Leumi rates and ceilings apply.">
          <select
            value={settings.year}
            onChange={(e) => set("year", Number(e.target.value))}
          >
            {SUPPORTED_YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Toggle
        label="Calendar year with no income at all"
        help="Tick if you had no employment income this year — salary resets to 0 and each grant's marginal tax starts from the first bracket."
        checked={settings.noIncomeYear}
        onChange={(v) => set("noIncomeYear", v)}
      />

      <h3>Optional</h3>
      <div className="grid">
        <Field
          label="USD/ILS exchange rate"
          help="Off: the live market rate is used. On: enter your own value (1.0000–7.0000)."
        >
          <div className="inline">
            <Toggle
              label=""
              checked={settings.fxOverride !== null}
              onChange={(on) => set("fxOverride", on ? Number(fxLive.toFixed(4)) : null)}
            />
            {settings.fxOverride === null ? (
              <span className="muted">
                {fxIsLive ? "live" : "fallback"}: {num(fxLive, 4)}
              </span>
            ) : (
              <NumberInput
                value={settings.fxOverride}
                onChange={(v) => set("fxOverride", v)}
                min={1}
                max={7}
                step={0.0001}
              />
            )}
          </div>
        </Field>

        <Field
          label="Extra capital gain (₪)"
          help="Profit (+) or loss (−) from other investment sales this tax year. Affects the surtax calculation. Can be negative."
        >
          <NumberInput
            value={settings.extraCapitalGain}
            onChange={(v) => set("extraCapitalGain", v)}
            step={1000}
          />
        </Field>
      </div>

      <Toggle
        label="Show net to bank in dollars"
        help="Net to Bank is shown in $ instead of ₪. Ignored when all grants are TASE listings."
        checked={settings.saleInDollars}
        onChange={(v) => set("saleInDollars", v)}
      />
    </section>
  );
}
