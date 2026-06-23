import type { Tone } from "../lib/format";
import { AnimatedValue } from "./ui";

export interface Segment {
  label: string;
  value: number;
  tone: Tone;
}

/**
 * A single horizontal bar that shows how a gross figure splits into its parts
 * (taxes, fees, and what you keep) — the visual heart of a tlush. Segment
 * widths transition smoothly as inputs change; the bar grows in on first paint.
 * Purely monochrome: the "kept" segment is brightest, deductions step darker.
 * The legend shows each part's share of the whole (the exact shekel figures
 * live in the statement rows just below it).
 */
export function BreakdownBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0) || 1;
  const share = (v: number) => `${Math.round((Math.max(0, v) / total) * 100)}%`;
  return (
    <div className="breakdown">
      <div className="breakdown-bar" role="img" aria-label="Breakdown of gross proceeds">
        {segments.map((s) => (
          <span
            key={s.label}
            className="breakdown-seg"
            data-tone={s.tone}
            style={{ width: `${(Math.max(0, s.value) / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="breakdown-legend">
        {segments.map((s) => (
          <li key={s.label} className="breakdown-item">
            <span className="breakdown-dot" data-tone={s.tone} aria-hidden="true" />
            <span className="breakdown-label">{s.label}</span>
            <span className="breakdown-val">
              <AnimatedValue value={s.value} format={share} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
