import { useState } from "react";
import { DEFAULT_FEES, type SaleFees } from "../lib/tax";
import { Field, NumberInput } from "./ui";

/** Optional per-grant/plan fee overrides. Blank fields fall back to defaults. */
export interface FeeOverrides {
  foreignPct: number | "";
  servicePct: number | "";
  wire: number | "";
  conversionPct: number | "";
}

export const EMPTY_FEES: FeeOverrides = {
  foreignPct: "",
  servicePct: "",
  wire: "",
  conversionPct: "",
};

export function resolveFees(o: FeeOverrides): SaleFees {
  return {
    foreignFee: o.foreignPct === "" ? DEFAULT_FEES.foreignFee : o.foreignPct / 100,
    serviceFee: o.servicePct === "" ? DEFAULT_FEES.serviceFee : o.servicePct / 100,
    wireFee: o.wire === "" ? DEFAULT_FEES.wireFee : o.wire,
    conversionFee:
      o.conversionPct === "" ? DEFAULT_FEES.conversionFee : o.conversionPct / 100,
  };
}

export function FeeEditor({
  value,
  onChange,
}: {
  value: FeeOverrides;
  onChange: (v: FeeOverrides) => void;
}) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof FeeOverrides>(k: K, v: FeeOverrides[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="fee-editor">
      <button type="button" className="link" onClick={() => setOpen((o) => !o)}>
        {open ? "− Hide sale fees" : "+ Customize sale fees"}
      </button>
      {open ? (
        <div className="grid">
          <Field label="Foreign fee (%)" help="Broker commission as a % of trade value (0.01–0.10).">
            <NumberInput value={value.foreignPct} onChange={(v) => set("foreignPct", v)} min={0.01} max={0.1} step={0.01} placeholder="0.07" />
          </Field>
          <Field label="Service fee (%)" help="Service fee as a % of trade value (0.03–0.60).">
            <NumberInput value={value.servicePct} onChange={(v) => set("servicePct", v)} min={0.03} max={0.6} step={0.01} placeholder="0.60" />
          </Field>
          <Field label="Wire fee (₪/$)" help="Flat wire-transfer fee once per sale (0–50).">
            <NumberInput value={value.wire} onChange={(v) => set("wire", v)} min={0} max={50} step={1} placeholder="20" />
          </Field>
          <Field label="Conversion fee (%)" help="USD→ILS conversion fee by the trustee (0–2).">
            <NumberInput value={value.conversionPct} onChange={(v) => set("conversionPct", v)} min={0} max={2} step={0.1} placeholder="0" />
          </Field>
        </div>
      ) : null}
    </div>
  );
}
