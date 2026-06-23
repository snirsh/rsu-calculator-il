import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Tone } from "../lib/format";

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
  tone,
  children,
}: {
  label: string;
  help?: string;
  value: ReactNode;
  /** Render as a bottom-line total (heavy rule, larger figure). */
  emphasis?: boolean;
  /** Tint the figure to match the breakdown key (sign tone or a category). */
  tone?: Tone;
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
        <span className={`result-value${tone ? ` ${tone}` : ""}`}>{value}</span>
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

/** Right-column placeholder shown until the inputs produce a result. */
export function EmptyResults() {
  return (
    <div className="results-empty">
      <p>Enter a stock price — or a symbol — and your after-tax breakdown appears here.</p>
    </div>
  );
}

/** True when the user asked the OS to minimise motion. Safe in non-browser envs. */
export function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduce;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * A figure that rolls from its previous value to the next one whenever it
 * changes (and counts up from zero on first appearance). Falls back to the
 * final value instantly when motion is reduced or rAF is unavailable (SSR/jsdom),
 * so the exact formatted number is always reachable for tests and a11y.
 */
export function AnimatedValue({
  value,
  format,
  duration = 650,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
}) {
  const reduce = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(0);
  const rafRef = useRef<number>();

  useEffect(() => {
    const canAnimate = !reduce && typeof requestAnimationFrame === "function";
    if (!canAnimate) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    let startTs = 0;
    const tick = (ts: number) => {
      if (!startTs) startTs = ts;
      const t = Math.min(1, (ts - startTs) / duration);
      const current = from + (to - from) * easeOutCubic(t);
      fromRef.current = current;
      setDisplay(current);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, reduce]);

  return <span className="num">{format(display)}</span>;
}
