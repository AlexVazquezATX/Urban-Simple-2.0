// Financials redesign — equation-style flow + trend + breakdowns
function USFinStat({ op, label, value, sub, tone, big }) {
  const S = UST;
  const c = { neutral: S.text, gold: S.gold, teal: S.teal, green: S.green }[tone || "neutral"];
  return (
    <div style={{
      flex: 1, position: "relative",
      background: big ? `linear-gradient(160deg, ${S.goldDim}, transparent 60%), ${S.card}` : S.card,
      border: `1px solid ${big ? S.goldLine : S.border}`,
      borderRadius: 14, padding: "18px 20px", fontFamily: S.body,
    }}>
      {op ? <div style={{
        position: "absolute", left: -22, top: "50%", transform: "translateY(-50%)",
        width: 22, textAlign: "center", fontFamily: S.mono, fontSize: 15, color: S.text3,
      }}>{op}</div> : null}
      <div style={{ fontFamily: S.mono, fontSize: 10.5, letterSpacing: "1.4px", color: S.text3, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: S.display, fontWeight: 700, fontSize: big ? 30 : 26, letterSpacing: "-1px", color: c, margin: "8px 0 6px", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11.5, color: S.text3, lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
}

function USBarRow({ name, value, pct, color, note }) {
  const S = UST;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 0", borderBottom: `1px solid ${S.borderSoft}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: S.text }}>{name}</span>
        <span style={{ fontFamily: S.mono, fontSize: 12.5, color: S.text, fontVariantNumeric: "tabular-nums" }}>{value}</span>
        <span style={{ fontFamily: S.mono, fontSize: 11, color: S.text3, width: 44, textAlign: "right" }}>{pct}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: S.card2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct, borderRadius: 3, background: color }}></div>
      </div>
      {note ? <div style={{ fontSize: 11, color: S.text3 }}>{note}</div> : null}
    </div>
  );
}

function USTrendChart() {
  const S = UST;
  const months = [
    { m: "JAN", rev: 62, cost: 48 }, { m: "FEB", rev: 70, cost: 56 }, { m: "MAR", rev: 58, cost: 50 },
    { m: "APR", rev: 78, cost: 60 }, { m: "MAY", rev: 86, cost: 66 }, { m: "JUN", rev: 92, cost: 70 },
  ];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 0, height: 150 }}>
        {months.map((d, i) => (
          <div key={d.m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: "100%" }}>
              <div style={{ width: 22, height: `${d.rev}%`, borderRadius: "5px 5px 2px 2px", background: i === 5 ? S.gold : S.goldDim, border: `1px solid ${i === 5 ? S.gold : S.goldLine}` }}></div>
              <div style={{ width: 22, height: `${d.cost}%`, borderRadius: "5px 5px 2px 2px", background: S.card2, border: `1px solid ${S.border}` }}></div>
            </div>
            <span style={{ fontFamily: S.mono, fontSize: 10, color: i === 5 ? S.gold : S.text3 }}>{d.m}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 18, marginTop: 14, fontSize: 11.5, color: S.text3, alignItems: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: S.gold, display: "inline-block" }}></span>Revenue</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: S.card2, border: `1px solid ${S.border}`, display: "inline-block" }}></span>All costs</span>
        <span style={{ marginLeft: "auto", fontFamily: S.mono, fontSize: 11 }}>gap between bars = net cash flow</span>
      </div>
    </div>
  );
}

function USFinancials() {
  const S = UST;
  return (
    <div style={{ display: "flex", width: 1440, height: 940, background: S.bg, overflow: "hidden", fontFamily: S.body }}>
      <USSidebar active="Financials" />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <USTopBar
          sub="Money · June 2026"
          title="Financials"
          right={<React.Fragment>
            <USBtn icon="camera">Snapshot now</USBtn>
            <USBtn icon="repeat" kind="soft">Recurring expenses</USBtn>
          </React.Fragment>}
        />

        <div style={{ padding: "0 32px 32px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* the money equation */}
          <div style={{ fontSize: 12.5, color: S.text3, margin: "-6px 0 0", padding: "0 2px" }}>
            Operating profit is the business's earning power. Net cash flow is what's left after owner draws.
          </div>
          <div style={{ display: "flex", gap: 22 }}>
            <USFinStat label="Monthly revenue" value="$118,659" sub="$1,423,908 annualized" tone="neutral" />
            <USFinStat op="−" label="Client costs" value="$64,500" sub="labor + materials" />
            <USFinStat op="−" label="Operating expenses" value="$32,833" sub="rent, software, payroll…" />
            <USFinStat op="=" label="Operating profit" value="$21,326" sub="18.0% operating margin" tone="teal" />
            <USFinStat op="−" label="Owner draws" value="$18,828" sub="taken from profit" />
            <USFinStat op="=" label="Net cash flow" value="$2,498" sub="2.1% net margin" tone="gold" big />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 16, alignItems: "start" }}>
            {/* trend */}
            <USCard>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{ fontFamily: S.display, fontWeight: 700, fontSize: 17, color: S.text, letterSpacing: "-0.3px" }}>Trend · last 6 months</span>
                <span style={{ fontSize: 12, color: S.text3 }}>Captured monthly</span>
              </div>
              <USTrendChart />
              <div style={{
                marginTop: 16, padding: "12px 14px", borderRadius: 10,
                background: S.tealDim, border: "1px solid rgba(82,214,195,0.2)",
                display: "flex", gap: 10, alignItems: "center",
              }}>
                <USIcon name="trend" size={15} color={S.teal} />
                <span style={{ fontSize: 12.5, color: S.text2 }}>Revenue is up <span style={{ color: S.teal, fontWeight: 600 }}>32%</span> since January while margin held steady.</span>
              </div>
            </USCard>

            {/* revenue by client */}
            <USCard>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontFamily: S.display, fontWeight: 700, fontSize: 17, color: S.text, letterSpacing: "-0.3px" }}>Revenue by client</div>
                <div style={{ fontSize: 11.5, color: S.text3, marginTop: 3 }}>Top-level clients · children rolled up</div>
              </div>
              <USBarRow name="Horseshoe Bay Resort" value="$42,713" pct="36%" color={S.teal} />
              <USBarRow name="Nectarine" value="$21,180" pct="18%" color={S.teal} />
              <USBarRow name="CALIZ Beverages" value="$16,450" pct="14%" color={S.teal} />
              <USBarRow name="Driftwood Tavern" value="$12,920" pct="11%" color={S.teal} />
              <USBarRow name="14 others" value="$25,396" pct="21%" color={S.card2} />
            </USCard>

            {/* expenses by category */}
            <USCard>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontFamily: S.display, fontWeight: 700, fontSize: 17, color: S.text, letterSpacing: "-0.3px" }}>Operating expenses</div>
                <div style={{ fontSize: 11.5, color: S.text3, marginTop: 3 }}>Owner draws excluded</div>
              </div>
              <USBarRow name="Rent" value="$7,400" pct="23%" color={S.gold} />
              <USBarRow name="Payroll (admin)" value="$6,900" pct="21%" color={S.gold} />
              <USBarRow name="Insurance" value="$5,210" pct="16%" color={S.gold} />
              <USBarRow name="Software" value="$4,480" pct="14%" color={S.gold} />
              <USBarRow name="Everything else" value="$8,843" pct="26%" color={S.card2} />
            </USCard>
          </div>
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { USFinancials });
