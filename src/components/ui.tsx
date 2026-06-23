import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/** Inline help marker with an accessible tooltip. */
export function Info({ text }: { text: string }) {
  return (
    <span className="info" tabIndex={0} aria-label={text} data-tip={text}>
      ?
    </span>
  );
}

/** A labelled form row with optional help text. */
export function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {help ? <Info text={help} /> : null}
      </span>
      {children}
    </label>
  );
}

/** A labelled checkbox toggle. */
export function Toggle({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="toggle">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id}>
        {label}
        {help ? <Info text={help} /> : null}
      </label>
    </div>
  );
}

/** A number input that keeps an empty string editable and reports a number. */
export function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
}: {
  value: number | "";
  onChange: (v: number | "") => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      onChange={(e) =>
        onChange(e.target.value === "" ? "" : Number(e.target.value))
      }
    />
  );
}

/** A result row: label (with help) on the left, value on the right. */
export function ResultRow({
  label,
  help,
  value,
  emphasis,
  children,
}: {
  label: string;
  help?: string;
  value: ReactNode;
  /** Render as a bottom-line total (heavy rule, larger pine figure). */
  emphasis?: boolean;
  /** Expandable detail revealed on click. */
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const expandable = Boolean(children);
  return (
    <div className={`result-row${expandable ? " expandable" : ""}${emphasis ? " emph" : ""}`}>
      <button
        type="button"
        className="result-head"
        onClick={() => expandable && setOpen((o) => !o)}
        aria-expanded={expandable ? open : undefined}
      >
        <span className="result-label">
          {expandable ? <span className="caret">{open ? "▾" : "▸"}</span> : null}
          {label}
          {help ? <Info text={help} /> : null}
        </span>
        <span className="result-value">{value}</span>
      </button>
      {expandable && open ? <div className="result-detail">{children}</div> : null}
    </div>
  );
}

/** Debounced effect helper. */
export function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    timer.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer.current);
  }, [value, delay]);
  return debounced;
}
