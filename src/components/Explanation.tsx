/** Reference page describing every field, toggle and result row. */
export function Explanation() {
  return (
    <article className="explanation panel">
      <h2>Explanation</h2>
      <p>
        A short reference for every field, toggle and result row. Calculations
        follow Section 102 of the Israeli Income Tax Ordinance (capital track),
        including selling and transfer fees. Everything runs in your browser —
        nothing is sent to a server or saved. This is not legal or tax advice.
      </p>

      <h3>General inputs</h3>
      <dl>
        <dt>Average monthly salary (₪)</dt>
        <dd>
          Gross monthly average — base + benefits + bonus, plus any RSU income
          spread over the year. Use a 12-month average; enter 0 if you didn't
          work this year, and each grant then asks for its own salary.
        </dd>
        <dt>Calendar year with no income at all</dt>
        <dd>
          Tick if you had no employment income this year — salary resets to 0 and
          each grant's marginal tax starts from the first bracket, while Bituah
          Leumi &amp; health use the salary at the granting workplace.
        </dd>
        <dt>USD/ILS exchange rate</dt>
        <dd>Off: the live market rate is used. On: enter your own value (1.0000–7.0000).</dd>
        <dt>Extra capital gain</dt>
        <dd>Profit (+) or loss (−) from other sales this year. Affects the surtax. Can be negative.</dd>
        <dt>Show net to bank in dollars</dt>
        <dd>Net to bank is shown in $ instead of ₪. Ignored when all grants are TASE listings.</dd>
      </dl>

      <h3>RSU — Restricted Stock Unit</h3>
      <p>
        RSUs are company shares granted as compensation. Under Section 102's
        capital track (held by a trustee), proceeds split into an income portion —
        taxed at your marginal rate — and a capital portion taxed at 25%, provided
        the 2-year holding is met; otherwise the whole benefit is ordinary income.
      </p>
      <dl>
        <dt>Stock symbol</dt>
        <dd>Ticker with autocomplete. For Tel Aviv listings add <code>.TA</code> (e.g. POLI.TA).</dd>
        <dt>Number of shares</dt>
        <dd>How many shares from this grant you intend to sell (at least 1).</dd>
        <dt>Grant date</dt>
        <dd>The date your shares were granted (not the vesting date).</dd>
        <dt>Set stock price</dt>
        <dd>Off: live price. On: override for what-if scenarios (up to 4 decimals).</dd>
        <dt>Grant price</dt>
        <dd>Average price over the 30 working days before the grant date — the income/capital split basis. Auto-filled from history; editable.</dd>
        <dt>Changed workplace</dt>
        <dd>Tick if you left the granting workplace; Bituah Leumi then uses that salary.</dd>
        <dt>What if 2 years pass?</dt>
        <dd>Applies the 2-year capital-gains rule even before 2 years have passed.</dd>
        <dt>Customize sale fees</dt>
        <dd>
          Override the broker defaults: foreign fee (0.01–0.10%), service fee
          (0.03–0.60%), wire fee (0–50, flat per sale), conversion fee (0–2%).
          Blank fields use the platform defaults.
        </dd>
      </dl>

      <h3>RSU result rows</h3>
      <dl>
        <dt>Gross</dt>
        <dd>Sale value before tax: price × shares × fx. Expand for the fee breakdown.</dd>
        <dt>Average tax deduction</dt>
        <dd>Total tax ÷ gross.</dd>
        <dt>Marginal tax</dt>
        <dd>Income tax on the revenue portion at the bracket matching your salary.</dd>
        <dt>Bituah Leumi &amp; health</dt>
        <dd>National insurance + health on the income portion, up to the ceiling.</dd>
        <dt>Capital tax</dt>
        <dd>Capital-gains tax on the capital portion (if the 2-year rule applies).</dd>
        <dt>Total net</dt>
        <dd>Gross − fees − (marginal + Bituah Leumi &amp; health + capital).</dd>
        <dt>Net to bank</dt>
        <dd>Amount that reaches your bank on the sale day (expand for the wire fee).</dd>
        <dt>Net to salary / Net tax refund</dt>
        <dd>Income-tax difference returned via salary, or claimable as a refund if you left the employer.</dd>
        <dt>Surtax owed / Magen Mas</dt>
        <dd>Extra 3%/5% surtax by annual income; a negative figure is a loss carried against future tax.</dd>
        <dt>2 years break-even stock price</dt>
        <dd>The future price where waiting to the 2-year mark matches selling now.</dd>
      </dl>

      <h3>ESPP — Employee Stock Purchase Plan</h3>
      <p>
        An ESPP lets you buy shares at a discount. With a trustee (Section 102)
        the capital portion is taxed at 25% when held long enough; without a
        trustee the tax on the discount is withheld at purchase.
      </p>
      <dl>
        <dt>With Trustee (102)</dt>
        <dd>On (default): trustee-held, capital portion at 25% if held &gt; 2 years from plan end. Off: direct purchase, taxes already withheld.</dd>
        <dt>Plan end date</dt>
        <dd>Last day of the plan — times the 2-year clock. Hidden without a trustee.</dd>
        <dt>Purchased / Discounted price</dt>
        <dd>Price before the discount, and the price you actually paid.</dd>
        <dt>USD/ILS rate at purchase</dt>
        <dd>The purchase-day rate; enables both dual-currency capital-gain methods. Optional.</dd>
      </dl>

      <h3>ESPP result rows</h3>
      <dl>
        <dt>Gross investment</dt>
        <dd>What you paid: discounted price × shares × purchase-day fx.</dd>
        <dt>Gross gain / loss</dt>
        <dd>Gross sale value minus your gross investment.</dd>
        <dt>Capital tax</dt>
        <dd>
          On the gain above the purchase price. With a purchase rate, expands to
          both dual-currency methods: the lower is taxed when both are positive;
          zero (Magen Mas) when both negative; zero when signs differ.
        </dd>
        <dt>Total net</dt>
        <dd>The full amount you walk away with: net gain + gross investment.</dd>
        <dt>Net gain / loss</dt>
        <dd>Total net minus your gross investment — the actual profit on your ESPP money.</dd>
        <dt>Tax on discount (paid)</dt>
        <dd>Without a trustee: marginal + Bituah Leumi withheld at purchase.</dd>
      </dl>
    </article>
  );
}
