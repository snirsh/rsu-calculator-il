import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, GlobalInputs, type Settings } from "./components/GlobalInputs";
import { RsuCalculator, newGrant, type Grant } from "./components/RsuCalculator";
import { EsppCalculator, newEspp, type EsppState } from "./components/EsppCalculator";
import { Explanation } from "./components/Explanation";
import { FALLBACK_USD_ILS, fetchUsdIls } from "./lib/market/fx";

type Tab = "rsu" | "espp" | "explanation";

export function App() {
  const [tab, setTab] = useState<Tab>("rsu");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [fxLive, setFxLive] = useState(FALLBACK_USD_ILS);
  const [fxIsLive, setFxIsLive] = useState(false);
  const [grants, setGrants] = useState<Grant[]>([newGrant()]);
  const [espp, setEspp] = useState<EsppState>(newEspp());

  useEffect(() => {
    fetchUsdIls().then(({ rate, live }) => {
      setFxLive(rate);
      setFxIsLive(live);
    });
  }, []);

  const fx =
    settings.fxOverride !== null && settings.fxOverride !== ""
      ? Number(settings.fxOverride)
      : fxLive;

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-text">
          <span className="eyebrow">Israeli RSU &amp; ESPP · Section 102 capital track</span>
          <h1>Tlush</h1>
          <p className="lede">
            See what actually reaches your bank. Your RSU or ESPP sale, run
            through every Israeli tax layer — income tax, Bituah Leumi, capital
            gains — entirely in your browser. Nothing leaves your device.
          </p>
        </div>
      </header>

      <nav className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "rsu"} className={tab === "rsu" ? "active" : ""} onClick={() => setTab("rsu")}>
          RSU
        </button>
        <button role="tab" aria-selected={tab === "espp"} className={tab === "espp" ? "active" : ""} onClick={() => setTab("espp")}>
          ESPP
        </button>
        <button role="tab" aria-selected={tab === "explanation"} className={tab === "explanation" ? "active" : ""} onClick={() => setTab("explanation")}>
          Explanation
        </button>
      </nav>

      {tab !== "explanation" ? (
        <GlobalInputs settings={settings} onChange={setSettings} fxLive={fxLive} fxIsLive={fxIsLive} />
      ) : null}

      {tab === "rsu" ? (
        <RsuCalculator settings={settings} fx={fx} grants={grants} setGrants={setGrants} />
      ) : null}
      {tab === "espp" ? (
        <EsppCalculator settings={settings} fx={fx} plan={espp} setPlan={setEspp} />
      ) : null}
      {tab === "explanation" ? <Explanation /> : null}

      <footer className="footer">
        <p>
          For educational use only — not legal, financial or tax advice. Tax
          rules change; verify figures with a licensed Israeli tax adviser before
          acting. Open-source and self-hostable.
        </p>
      </footer>
    </div>
  );
}
