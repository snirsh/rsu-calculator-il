import { useEffect, useState } from "react";
import { searchSymbols, type SymbolMatch } from "../lib/market/search";
import { useDebounced } from "./ui";

/** Stock-symbol field with type-ahead autocomplete. */
export function SymbolInput({
  value,
  onChange,
  onPick,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (symbol: string) => void;
}) {
  const [matches, setMatches] = useState<SymbolMatch[]>([]);
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(value, 250);

  useEffect(() => {
    let active = true;
    if (debounced.trim().length < 1) {
      setMatches([]);
      return;
    }
    searchSymbols(debounced).then((m) => {
      if (active) setMatches(m);
    });
    return () => {
      active = false;
    };
  }, [debounced]);

  return (
    <div className="symbol-input">
      <input
        type="text"
        value={value}
        placeholder="e.g. AAPL or POLI.TA"
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 ? (
        <ul className="symbol-list">
          {matches.map((m) => (
            <li key={`${m.symbol}-${m.exchange}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(m.symbol);
                  onPick(m.symbol);
                  setOpen(false);
                }}
              >
                <span className="sym">{m.symbol}</span>
                <span className="sym-name">{m.name}</span>
                {m.exchange ? <span className="sym-exch">{m.exchange}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
