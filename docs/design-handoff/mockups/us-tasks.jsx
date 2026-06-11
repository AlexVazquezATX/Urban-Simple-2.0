// Tasks redesign — projects rail + goals + task list
function USProjRow({ dot, name, count, active, icon }) {
  const S = UST;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8,
      background: active ? S.goldDim : "transparent",
      border: `1px solid ${active ? S.goldLine : "transparent"}`,
      color: active ? S.gold : S.text2, fontSize: 13.5, fontWeight: active ? 600 : 450,
    }}>
      {icon ? <USIcon name={icon} size={14} color={active ? S.gold : S.text3} />
        : <span style={{ width: 8, height: 8, borderRadius: 4, background: dot, flexShrink: 0 }}></span>}
      <span style={{ flex: 1 }}>{name}</span>
      {count != null ? <span style={{ fontFamily: S.mono, fontSize: 10.5, color: S.text3 }}>{count}</span> : null}
    </div>
  );
}

function USTaskRow({ title, project, projectColor, tag, due, priority, focus, done }) {
  const S = UST;
  const prColor = { high: S.coral, med: S.gold, low: S.text3 }[priority];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "13px 18px",
      background: S.card, border: `1px solid ${S.border}`, borderRadius: 12,
    }}>
      <USIcon name="star" size={14} color={focus ? S.gold : S.text3} style={{ opacity: focus ? 1 : 0.45 }} />
      <div style={{
        width: 19, height: 19, borderRadius: 10, flexShrink: 0,
        border: `1.5px solid ${done ? S.green : S.text3}`, background: done ? S.greenDim : "transparent",
        display: "grid", placeItems: "center",
      }}>{done ? <USIcon name="check" size={10} color={S.green} sw={2.4} /> : null}</div>
      <div style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: prColor }}></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: done ? S.text3 : S.text, textDecoration: done ? "line-through" : "none" }}>{title}</span>
          {focus ? <USChip tone="gold"><USIcon name="spark" size={10} color={S.gold} /> Focus</USChip> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: S.text3 }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: projectColor, display: "inline-block" }}></span>{project}
          </span>
          {tag ? <span style={{ fontSize: 11, color: S.text3, background: S.card2, border: `1px solid ${S.borderSoft}`, borderRadius: 6, padding: "1px 7px" }}>{tag}</span> : null}
        </div>
      </div>
      <span style={{ fontFamily: S.mono, fontSize: 11.5, color: due === "Today" ? S.gold : S.text3 }}>{due}</span>
    </div>
  );
}

function USGoalChip({ text, done }) {
  const S = UST;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px",
      borderRadius: 99, fontSize: 12.5, fontWeight: 500,
      background: done ? S.greenDim : S.card2,
      border: `1px solid ${done ? "rgba(143,204,133,0.3)" : S.border}`,
      color: done ? S.green : S.text2,
    }}>
      <span style={{
        width: 14, height: 14, borderRadius: 7, display: "inline-grid", placeItems: "center",
        border: `1.5px solid ${done ? S.green : S.text3}`,
      }}>{done ? <USIcon name="check" size={8} color={S.green} sw={2.6} /> : null}</span>
      {text}
    </div>
  );
}

function USTasks() {
  const S = UST;
  return (
    <div style={{ display: "flex", width: 1440, height: 940, background: S.bg, overflow: "hidden", fontFamily: S.body }}>
      <USSidebar active="Tasks" />

      {/* projects rail */}
      <div style={{ width: 218, flexShrink: 0, padding: "24px 14px", borderRight: `1px solid ${S.borderSoft}`, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "0 8px" }}>
          <span style={{ fontFamily: S.display, fontWeight: 700, fontSize: 16, color: S.text, letterSpacing: "-0.3px", flex: 1 }}>Projects</span>
          <USIcon name="plus" size={15} color={S.gold} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <USProjRow icon="star" name="Today's Focus" count="3" />
          <USProjRow icon="check" name="All tasks" count="7" active />
        </div>
        <div>
          <div style={{ fontSize: 9.5, letterSpacing: "1.8px", color: S.text3, fontFamily: S.mono, textTransform: "uppercase", padding: "0 8px 8px" }}>By project</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <USProjRow dot="#F08070" name="CALIZ Beverages" count="2" />
            <USProjRow dot="#7FA8E0" name="Personal" count="1" />
            <USProjRow dot="#8FCC85" name="Urban Simple" count="3" />
            <USProjRow dot="#E9B84F" name="Notes" count="0" />
            <USProjRow dot="#D886C8" name="Marketing" count="1" />
          </div>
        </div>
      </div>

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <USTopBar
          sub="7 open · 2 done today"
          title="All tasks"
          right={<React.Fragment>
            <div style={{ display: "flex", border: `1px solid ${S.border}`, borderRadius: 9, overflow: "hidden" }}>
              {["List", "Board", "Calendar"].map((v, i) => (
                <span key={v} style={{
                  padding: "7px 13px", fontSize: 12.5, fontWeight: i === 0 ? 600 : 450,
                  color: i === 0 ? S.text : S.text3, background: i === 0 ? S.card2 : "transparent",
                  borderRight: i < 2 ? `1px solid ${S.border}` : "none",
                }}>{v}</span>
              ))}
            </div>
            <USBtn icon="plus" kind="gold">New task</USBtn>
          </React.Fragment>}
        />

        <div style={{ padding: "0 32px 32px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* search + quick add */}
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, color: S.text3, fontSize: 13 }}>
              <USIcon name="search" size={14} color={S.text3} /> Search tasks…
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 9, padding: "9px 14px", background: S.card, border: `1px dashed ${S.border}`, borderRadius: 10, color: S.text3, fontSize: 13 }}>
              <USIcon name="plus" size={14} color={S.gold} /> Quick add — type and hit return
            </div>
            <USBtn>Status · 2</USBtn>
            <USBtn>Priority</USBtn>
          </div>

          {/* week goals */}
          <USCard pad={18}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 13 }}>
              <span style={{ fontFamily: S.display, fontWeight: 700, fontSize: 16, color: S.text, letterSpacing: "-0.3px" }}>This week's goals</span>
              <span style={{ fontFamily: S.mono, fontSize: 11, color: S.text3 }}>JUN 8 – 14</span>
              <span style={{ flex: 1 }}></span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 90, height: 5, borderRadius: 3, background: S.card2 }}>
                  <div style={{ width: "40%", height: "100%", borderRadius: 3, background: S.gold }}></div>
                </div>
                <span style={{ fontFamily: S.mono, fontSize: 11.5, color: S.gold }}>2/5</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <USGoalChip text="Close CALIZ proposal" done />
              <USGoalChip text="Ship June invoices" done />
              <USGoalChip text="Hire one night-crew lead" />
              <USGoalChip text="Publish 2 blog posts" />
              <USGoalChip text="Walkthrough at Driftwood" />
            </div>
          </USCard>

          {/* today group */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 2px" }}>
              <span style={{ fontFamily: S.mono, fontSize: 11, letterSpacing: "1.6px", color: S.gold, textTransform: "uppercase" }}>Today</span>
              <span style={{ flex: 1, height: 1, background: S.borderSoft }}></span>
            </div>
            <USTaskRow focus title="Create content for the week" project="Urban Simple" projectColor="#8FCC85" tag="Content" due="Today" priority="high" />
            <USTaskRow title="Reply to CALIZ Beverages proposal" project="CALIZ Beverages" projectColor="#F08070" tag="Pipeline" due="Today" priority="high" />
            <USTaskRow done title="Send May invoices" project="Urban Simple" projectColor="#8FCC85" tag="Billing" due="Today" priority="med" />
          </div>

          {/* this week group */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 2px" }}>
              <span style={{ fontFamily: S.mono, fontSize: 11, letterSpacing: "1.6px", color: S.text3, textTransform: "uppercase" }}>This week</span>
              <span style={{ flex: 1, height: 1, background: S.borderSoft }}></span>
            </div>
            <USTaskRow title="Draft night-crew lead job post" project="Urban Simple" projectColor="#8FCC85" tag="Hiring" due="Thu" priority="med" />
            <USTaskRow title="Schedule Driftwood walkthrough" project="Marketing" projectColor="#D886C8" due="Fri" priority="med" />
            <USTaskRow title="Renew liability insurance" project="Personal" projectColor="#7FA8E0" due="Sat" priority="low" />
          </div>
        </div>
      </main>
    </div>
  );
}

Object.assign(window, { USTasks });
