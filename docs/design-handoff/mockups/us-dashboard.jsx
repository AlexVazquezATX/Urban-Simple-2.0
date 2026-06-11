// Dashboard redesign — Urban Simple admin
function USDashStat({ label, value, sub, tone = "neutral", delta, icon }) {
  const S = UST;
  const toneColor = { neutral: S.text, gold: S.gold, teal: S.teal, coral: S.coral }[tone];
  return (
    <USCard style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }} pad={18}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: S.mono, fontSize: 10.5, letterSpacing: "1.4px", color: S.text3, textTransform: "uppercase" }}>{label}</span>
        <USIcon name={icon} size={15} color={S.text3} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
        <span style={{ fontFamily: S.display, fontWeight: 700, fontSize: 30, letterSpacing: "-1px", color: toneColor, fontVariantNumeric: "tabular-nums" }}>{value}</span>
        {delta ? <USChip tone={delta.tone}>{delta.text}</USChip> : null}
      </div>
      <div style={{ fontSize: 12, color: S.text3 }}>{sub}</div>
    </USCard>
  );
}

function USShiftRow({ time, client, place, crew, lead, status, statusTone }) {
  const S = UST;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: S.card2, border: `1px solid ${S.borderSoft}`, borderRadius: 11 }}>
      <div style={{ fontFamily: S.mono, fontSize: 13, color: S.gold, width: 64, fontVariantNumeric: "tabular-nums" }}>{time}</div>
      <div style={{ width: 1, alignSelf: "stretch", background: S.border }}></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: S.text }}>{client}</div>
        <div style={{ fontSize: 11.5, color: S.text3, marginTop: 1 }}>{place}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {crew.map((c, i) => (
          <div key={i} style={{
            width: 24, height: 24, borderRadius: 12, marginLeft: i === 0 ? 0 : -10,
            background: ["#3D5A66", "#5C4D6B", "#5F5A3B", "#6B4D4D"][i % 4],
            border: `2px solid ${S.card}`, display: "grid", placeItems: "center",
            fontSize: 9.5, fontWeight: 700, color: "#F3EFE6", fontFamily: S.body,
          }}>{c}</div>
        ))}
        <span style={{ fontSize: 11.5, color: S.text3, marginLeft: 4 }}>{lead}</span>
      </div>
      <USChip tone={statusTone}>{status}</USChip>
    </div>
  );
}

function USFocusRow({ done, text, meta }) {
  const S = UST;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px" }}>
      <div style={{
        width: 18, height: 18, borderRadius: 9, flexShrink: 0,
        border: `1.5px solid ${done ? S.green : S.text3}`,
        background: done ? S.greenDim : "transparent",
        display: "grid", placeItems: "center",
      }}>{done ? <USIcon name="check" size={10} color={S.green} sw={2.4} /> : null}</div>
      <span style={{ flex: 1, fontSize: 13.5, color: done ? S.text3 : S.text, textDecoration: done ? "line-through" : "none" }}>{text}</span>
      <span style={{ fontFamily: S.mono, fontSize: 10.5, color: S.text3 }}>{meta}</span>
    </div>
  );
}

function USAttnRow({ icon, tone, title, sub, cta }) {
  const S = UST;
  const c = { coral: S.coral, gold: S.gold, teal: S.teal }[tone];
  const cDim = { coral: S.coralDim, gold: S.goldDim, teal: S.tealDim }[tone];
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: `1px solid ${S.borderSoft}` }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, background: cDim, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <USIcon name={icon} size={14} color={c} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: S.text, lineHeight: 1.3 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: S.text3, marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ fontSize: 12, color: c, fontWeight: 600, alignSelf: "center", whiteSpace: "nowrap" }}>{cta}</span>
    </div>
  );
}

function USQuick({ icon, label }) {
  const S = UST;
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 8, padding: "14px 12px",
      background: S.card2, border: `1px solid ${S.borderSoft}`, borderRadius: 11, flex: 1,
    }}>
      <USIcon name={icon} size={16} color={S.gold} />
      <span style={{ fontSize: 12, fontWeight: 600, color: S.text2 }}>{label}</span>
    </div>
  );
}

function USDashboard() {
  const S = UST;
  return (
    <div style={{ display: "flex", width: 1440, height: 940, background: S.bg, overflow: "hidden", fontFamily: S.body }}>
      <USSidebar active="Dashboard" />
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <USTopBar
          sub="Tuesday · June 10"
          title="Good afternoon, Alex"
          right={<React.Fragment>
            <USBtn icon="camera">Snapshot</USBtn>
            <USBtn icon="plus" kind="gold">New task</USBtn>
          </React.Fragment>}
        />

        <div style={{ padding: "0 32px 32px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Briefing */}
          <div style={{
            display: "flex", alignItems: "center", gap: 18, padding: "16px 20px",
            background: `linear-gradient(90deg, ${S.goldDim}, transparent 55%), ${S.card}`,
            border: `1px solid ${S.goldLine}`, borderRadius: 14,
          }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: S.goldDim, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <USIcon name="spark" size={17} color={S.gold} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: S.text }}>Today's briefing</span>
                <USChip tone="gold">12 items</USChip>
              </div>
              <div style={{ fontSize: 12.5, color: S.text2, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Two shifts tonight, one flagged issue at Nectarine, and three invoices ready to send. CALIZ proposal expects a reply by Thursday.
              </div>
            </div>
            <USBtn kind="soft" style={{ flexShrink: 0 }}>Read briefing</USBtn>
          </div>

          {/* KPI row */}
          <div style={{ display: "flex", gap: 16 }}>
            <USDashStat label="Active clients" value="18" sub="2 onboarding this month" icon="users" delta={{ tone: "green", text: "+2" }} />
            <USDashStat label="AR outstanding" value="$12,480" sub="View aging report →" icon="dollar" tone="neutral" />
            <USDashStat label="Invoiced · June" value="$24,300" sub="Revenue invoiced so far" icon="calendar" tone="teal" delta={{ tone: "teal", text: "on pace" }} />
            <USDashStat label="Overdue" value="1" sub="Invoice #1042 · 6 days" icon="alert" tone="coral" />
          </div>

          {/* main grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, alignItems: "start" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Tonight's operations */}
              <USCard>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <USIcon name="moon" size={16} color={S.teal} />
                  <span style={{ fontFamily: S.display, fontWeight: 700, fontSize: 17, color: S.text, letterSpacing: "-0.3px" }}>Tonight's operations</span>
                  <span style={{ flex: 1 }}></span>
                  <span style={{ fontSize: 12.5, color: S.text3 }}>2 shifts · 7 crew</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <USShiftRow time="10:30 PM" client="Nectarine" place="Kitchen + hood line · Downtown" crew={["M", "J", "R"]} lead="Marco leads" status="Confirmed" statusTone="green" />
                  <USShiftRow time="11:15 PM" client="Horseshoe Bay Resort" place="Main kitchen · Banquet prep" crew={["D", "S", "K", "P"]} lead="Dana leads" status="En route" statusTone="teal" />
                </div>
              </USCard>

              {/* Today's focus */}
              <USCard>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <USIcon name="star" size={16} color={S.gold} />
                  <span style={{ fontFamily: S.display, fontWeight: 700, fontSize: 17, color: S.text, letterSpacing: "-0.3px" }}>Today's focus</span>
                  <USChip tone="gold" style={{ marginLeft: 2 }}>1 of 3</USChip>
                  <span style={{ flex: 1 }}></span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: S.gold, fontWeight: 600 }}>
                    <USIcon name="spark" size={13} color={S.gold} /> Regenerate
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <USFocusRow done text="Send May invoices — 3 clients ready" meta="Billing" />
                  <USFocusRow text="Reply to CALIZ Beverages proposal" meta="Pipeline" />
                  <USFocusRow text="Review Nectarine walkthrough photos" meta="Clients" />
                </div>
              </USCard>
            </div>

            {/* right rail */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <USCard>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <USIcon name="bell" size={15} color={S.coral} />
                  <span style={{ fontFamily: S.display, fontWeight: 700, fontSize: 16, color: S.text, letterSpacing: "-0.3px" }}>Needs attention</span>
                  <span style={{ flex: 1 }}></span>
                  <USChip tone="coral">2</USChip>
                </div>
                <USAttnRow icon="flag" tone="coral" title="Nectarine flagged an issue" sub="Hood filter needs replacement · 2h ago" cta="Review" />
                <USAttnRow icon="clock" tone="gold" title="Invoice #1042 is 6 days overdue" sub="CALIZ Beverages · $1,840" cta="Nudge" />
                <div style={{ paddingTop: 12, fontSize: 12, color: S.text3, textAlign: "center" }}>That's everything — nice and tidy.</div>
              </USCard>

              <USCard>
                <div style={{ fontFamily: S.display, fontWeight: 700, fontSize: 16, color: S.text, letterSpacing: "-0.3px", marginBottom: 12 }}>Quick actions</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <USQuick icon="plus" label="Add a client" />
                  <USQuick icon="camera" label="Log walkthrough" />
                  <USQuick icon="doc" label="Create invoice" />
                  <USQuick icon="check" label="Manage tasks" />
                </div>
              </USCard>

              {/* mini month strip */}
              <USCard pad={18}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontFamily: S.mono, fontSize: 10.5, letterSpacing: "1.4px", color: S.text3, textTransform: "uppercase" }}>Net cash flow · 6 mo</span>
                  <span style={{ fontFamily: S.mono, fontSize: 12, color: S.green }}>+$2,498</span>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 52 }}>
                  {[34, 48, 28, 56, 44, 68].map((h, i) => (
                    <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 4, background: i === 5 ? S.gold : S.card2, border: `1px solid ${i === 5 ? S.goldLine : S.border}` }}></div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: S.mono, fontSize: 9.5, color: S.text3 }}>
                  <span>JAN</span><span>JUN</span>
                </div>
              </USCard>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { USDashboard });
