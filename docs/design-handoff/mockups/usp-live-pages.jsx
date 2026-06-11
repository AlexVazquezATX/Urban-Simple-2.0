// LIVE portal — inner pages: Walkthrough, Cleaning log, Issues
function LivePageShell({ T, page, go, children, wide }) {
  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.body }}>
      <LiveNav T={T} page={page} go={go} />
      <div style={{ maxWidth: wide ? 1080 : 920, margin: "0 auto", padding: `${T.s(36)}px 40px ${T.s(64)}px` }}>
        {children}
      </div>
    </div>
  );
}

function LiveStripedThumb({ T, label, w, h }) {
  return (
    <div style={{
      width: w || "100%", height: h || 72, borderRadius: 10, display: "grid", placeItems: "center",
      background: `repeating-linear-gradient(45deg, ${T.panel}, ${T.panel} 6px, #EFE8D8 6px, #EFE8D8 12px)`,
      border: `1px solid ${T.border}`,
    }}>
      <span style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: "1px", color: T.faint }}>{label}</span>
    </div>
  );
}

// ---------------- WALKTHROUGH ----------------
const liveZones = [
  { id: "hood", name: "Hood line", hint: "Filters, baffles, and the line behind them." },
  { id: "fryers", name: "Fryers", hint: "Boil-out residue, oil level, surrounding floor." },
  { id: "walkin", name: "Walk-in", hint: "Shelving, door gasket, floor corners, temps." },
  { id: "floors", name: "Floors", hint: "Under equipment, drains, and grout lines." },
  { id: "prep", name: "Prep stations", hint: "Cutting surfaces, under-counters, sanitizer." },
  { id: "dish", name: "Dish pit", hint: "Machine interior, curtains, sprayer, walls." },
];

function LiveWalkthrough({ T, go }) {
  const [doneZones, setDoneZones] = React.useState(["hood", "fryers"]);
  const [active, setActive] = React.useState("walkin");
  const zone = liveZones.find((z) => z.id === active);
  const markDone = () => {
    const d = doneZones.includes(active) ? doneZones : [...doneZones, active];
    setDoneZones(d);
    const next = liveZones.find((z) => !d.includes(z.id));
    if (next) setActive(next.id);
  };
  const pct = Math.round((doneZones.length / liveZones.length) * 100);
  return (
    <LivePageShell T={T} page="walkthrough" go={go} wide>
      <LivePageHead T={T} kicker="TUESDAY · JUNE 10" title="Walkthrough"
        sub="Move through the kitchen zone by zone — photos and notes land straight in your log."
        right={
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: T.mono, fontSize: 11.5, color: T.sub, marginBottom: 8 }}>{doneZones.length} of {liveZones.length} zones</div>
            <div style={{ width: 160, height: 6, borderRadius: 3, background: T.panel }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: T.accent, transition: "width .3s" }}></div>
            </div>
          </div>
        } />
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, alignItems: "start" }}>
        {/* zone list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {liveZones.map((z) => {
            const isDone = doneZones.includes(z.id);
            const isActive = z.id === active;
            return (
              <div key={z.id} onClick={() => setActive(z.id)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderRadius: 13, cursor: "pointer",
                background: isActive ? T.card : "transparent",
                border: `1px solid ${isActive ? T.accentLine : T.border}`,
                boxShadow: isActive ? "0 2px 8px rgba(70,58,30,0.07)" : "none",
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 11, display: "grid", placeItems: "center", flexShrink: 0,
                  background: isDone ? T.sage : "transparent",
                  border: `1.5px solid ${isDone ? T.sageLine : isActive ? T.accent : T.border}`,
                }}>
                  {isDone ? <USIcon name="check" size={11} color={T.sageDeep} sw={2.4} /> : null}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: isActive ? 650 : 500, color: isDone ? T.faint : T.ink }}>{z.name}</div>
                </div>
                {isActive ? <span style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: "1.4px", color: T.accent }}>NOW</span> : null}
              </div>
            );
          })}
        </div>

        {/* capture panel */}
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: T.s(26), boxShadow: "0 1px 3px rgba(70,58,30,0.05)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
            <h2 style={{ margin: 0, fontFamily: T.display, fontWeight: 700, fontSize: 23, letterSpacing: "-0.5px", color: T.ink }}>{zone.name}</h2>
            {doneZones.includes(zone.id) ? (
              <span style={{ fontSize: 11.5, fontWeight: 650, color: T.sageDeep, background: T.sage, border: `1px solid ${T.sageLine}`, borderRadius: 99, padding: "2px 10px" }}>Complete</span>
            ) : null}
          </div>
          <div style={{ fontSize: 13.5, color: T.sub, marginBottom: 20 }}>{zone.hint}</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 18 }}>
            <image-slot id={`wt-${zone.id}-1`} radius="14" placeholder="tap to add photo" style={{ width: "100%", height: 150 }}></image-slot>
            <image-slot id={`wt-${zone.id}-2`} radius="14" placeholder="tap to add photo" style={{ width: "100%", height: 150 }}></image-slot>
            <div style={{
              borderRadius: 14, border: `1.5px dashed ${T.accentLine}`, display: "grid", placeItems: "center",
              color: T.accent, background: T.accentBg, cursor: "pointer", height: 150,
            }}>
              <div style={{ textAlign: "center" }}>
                <USIcon name="camera" size={20} color={T.accent} />
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6 }}>More photos</div>
              </div>
            </div>
          </div>

          <textarea placeholder={`A note about the ${zone.name.toLowerCase()}… (optional)`} style={{
            width: "100%", minHeight: 84, padding: "14px 16px", borderRadius: 13,
            border: `1px solid ${T.border}`, background: T.bg, fontSize: 14, fontFamily: T.body,
            color: T.ink, outline: "none", resize: "vertical",
          }}></textarea>

          <div style={{ display: "flex", gap: 10, marginTop: 18, alignItems: "center" }}>
            <LiveBtn T={T} primary icon="check" onClick={markDone}>Mark zone complete</LiveBtn>
            <LiveBtn T={T} onClick={markDone}>Skip for now</LiveBtn>
            <span style={{ marginLeft: "auto", fontSize: 12, color: T.faint }}>Saved automatically</span>
          </div>
        </div>
      </div>
    </LivePageShell>
  );
}

// ---------------- CLEANING LOG ----------------
function LiveLogVisit({ T, date, time, crew, zones, note, photos, latest, children }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${latest ? T.accentLine : T.border}`, borderRadius: 18, padding: T.s(24), boxShadow: "0 1px 3px rgba(70,58,30,0.05)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 4 }}>
        <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 17.5, letterSpacing: "-0.3px", color: T.ink }}>{date}</span>
        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.faint }}>{time}</span>
        {latest ? <span style={{ fontSize: 11, fontWeight: 650, color: T.accent, background: T.accentBg, border: `1px solid ${T.accentLine}`, borderRadius: 99, padding: "2px 10px" }}>Last night</span> : null}
        <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 600, color: T.accent, cursor: "pointer" }}>Open visit →</span>
      </div>
      <div style={{ fontSize: 12.5, color: T.sub, marginBottom: 14 }}>{crew}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {zones.map((z) => (
          <span key={z} style={{ fontSize: 11.5, fontWeight: 550, color: T.sub, background: T.panel, borderRadius: 99, padding: "3px 11px" }}>{z}</span>
        ))}
      </div>
      {note ? (
        <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.5, padding: "12px 16px", background: T.panel, borderRadius: 12, marginBottom: 14 }}>
          <span style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: "1.6px", color: T.faint, display: "block", marginBottom: 5 }}>CREW NOTE</span>
          {note}
        </div>
      ) : null}
      {children}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {photos}
      </div>
    </div>
  );
}

function LiveLog({ T, go }) {
  const [month, setMonth] = React.useState("June");
  return (
    <LivePageShell T={T} page="log" go={go}>
      <LivePageHead T={T} kicker="EVERY VISIT, PHOTOGRAPHED" title="Cleaning log"
        sub="The full history of your kitchen — what was done, by whom, with proof."
        right={
          <div style={{ display: "flex", gap: 6 }}>
            {["June", "May", "April"].map((m) => (
              <span key={m} onClick={() => setMonth(m)} style={{
                fontSize: 12.5, fontWeight: m === month ? 650 : 500, cursor: "pointer", padding: "7px 15px", borderRadius: 99,
                color: m === month ? "#FCFAF5" : T.sub, background: m === month ? T.ink : T.card,
                border: `1px solid ${m === month ? T.ink : T.border}`,
              }}>{m}</span>
            ))}
          </div>
        } />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <LiveLogVisit T={T} latest date="Monday · June 9" time="11:02 PM – 4:12 AM" crew="Marco, Jess, Rui · 5h 10m"
          zones={["Hood line", "Fryers", "Floors", "Dish pit"]}
          note="Hood filters were heavier than usual — recommend swapping to the deeper-clean cadence for summer. Left the walk-in for Thursday as planned."
          photos={
            <React.Fragment>
              {["g1", "g2", "g3"].map((id) => (
                <image-slot key={id} id={`pd-${id}`} radius="10" placeholder="photo" style={{ width: 86, height: 64 }}></image-slot>
              ))}
              <div style={{ width: 86, height: 64, borderRadius: 10, background: T.panel, border: `1px solid ${T.border}`, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 650, color: T.sub }}>+11</div>
            </React.Fragment>
          } />
        <LiveLogVisit T={T} date="Thursday · June 5" time="10:48 PM – 3:35 AM" crew="Dana, Sam, Kim · 4h 47m"
          zones={["Walk-in", "Prep stations", "Floors"]}
          note="Walk-in door gasket is coming loose on the hinge side — flagged it in Issues."
          photos={
            <React.Fragment>
              <LiveStripedThumb T={T} label="photo" w={86} h={64} />
              <LiveStripedThumb T={T} label="photo" w={86} h={64} />
              <div style={{ width: 86, height: 64, borderRadius: 10, background: T.panel, border: `1px solid ${T.border}`, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 650, color: T.sub }}>+9</div>
            </React.Fragment>
          } />
        <LiveLogVisit T={T} date="Monday · June 2" time="11:10 PM – 4:02 AM" crew="Marco, Jess, Rui · 4h 52m"
          zones={["Hood line", "Fryers", "Dish pit", "Grease trap"]}
          photos={
            <React.Fragment>
              <LiveStripedThumb T={T} label="photo" w={86} h={64} />
              <LiveStripedThumb T={T} label="photo" w={86} h={64} />
              <div style={{ width: 86, height: 64, borderRadius: 10, background: T.panel, border: `1px solid ${T.border}`, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 650, color: T.sub }}>+12</div>
            </React.Fragment>
          } />
      </div>
    </LivePageShell>
  );
}

// ---------------- ISSUES ----------------
function LiveIssueCard({ T, status, title, meta, body, reply, thumbs }) {
  const badge = {
    open: ["Open — we're on it", T.coral, T.coralLine, T.coralDeep],
    scheduled: ["Scheduled · Thu visit", T.sky, T.skyLine, T.skyDeep],
    resolved: ["Resolved", T.sage, T.sageLine, T.sageDeep],
  }[status];
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, padding: T.s(24), boxShadow: "0 1px 3px rgba(70,58,30,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <span style={{ fontFamily: T.display, fontWeight: 700, fontSize: 16.5, letterSpacing: "-0.3px", color: T.ink, flex: 1 }}>{title}</span>
        <span style={{ fontSize: 11.5, fontWeight: 650, color: badge[3], background: badge[1], border: `1px solid ${badge[2]}`, borderRadius: 99, padding: "3px 12px", whiteSpace: "nowrap" }}>{badge[0]}</span>
      </div>
      <div style={{ fontSize: 12, color: T.faint, marginBottom: body ? 12 : 0 }}>{meta}</div>
      {body ? <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.55, marginBottom: reply || thumbs ? 14 : 0 }}>{body}</div> : null}
      {thumbs ? <div style={{ display: "flex", gap: 8, marginBottom: reply ? 14 : 0 }}>{thumbs}</div> : null}
      {reply ? (
        <div style={{ display: "flex", gap: 12, padding: "13px 16px", background: T.panel, borderRadius: 13 }}>
          <div style={{ width: 28, height: 28, borderRadius: 14, background: T.accentBg, display: "grid", placeItems: "center", fontFamily: T.display, fontWeight: 700, fontSize: 11, color: T.accent, flexShrink: 0 }}>M</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 650, color: T.ink }}>Marco <span style={{ fontWeight: 400, color: T.faint }}>· 2h ago</span></div>
            <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, marginTop: 3 }}>{reply}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LiveIssues({ T, go }) {
  return (
    <LivePageShell T={T} page="issues" go={go}>
      <LivePageHead T={T} kicker="FLAG IT — WE'LL HANDLE IT" title="Issues"
        sub="Anything that needs attention. You flag it, we schedule it, you see it resolved."
        right={<LiveBtn T={T} primary icon="flag">Report something</LiveBtn>} />
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {[["All", true], ["Open · 1", false], ["Scheduled · 1", false], ["Resolved · 4", false]].map(([l, on]) => (
          <span key={l} style={{
            fontSize: 12.5, fontWeight: on ? 650 : 500, padding: "7px 15px", borderRadius: 99, cursor: "pointer",
            color: on ? "#FCFAF5" : T.sub, background: on ? T.ink : T.card, border: `1px solid ${on ? T.ink : T.border}`,
          }}>{l}</span>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <LiveIssueCard T={T} status="open" title="Hood filter needs replacement"
          meta="Flagged by Marco's crew · last night · Hood line"
          body="Two filters on the east end are past cleaning — mesh is starting to break down. Recommend replacement before the weekend rush."
          thumbs={<image-slot id="iss-hood" radius="10" placeholder="photo" style={{ width: 110, height: 76 }}></image-slot>}
          reply="Ordered two replacements this morning — they'll be in before Thursday's visit and we'll install them same night." />
        <LiveIssueCard T={T} status="scheduled" title="Walk-in door gasket loose"
          meta="Flagged by Dana's crew · June 5 · Walk-in"
          body="Gasket pulling away on the hinge side. Not leaking yet, but worth re-seating before it tears." />
        <LiveIssueCard T={T} status="resolved" title="Grease trap odor near dish pit"
          meta="Flagged by you · May 28 · Resolved June 2"
          reply="Deep-cleaned the trap and treated the line on June 2 — let us know if it comes back, but it should be gone for good." />
      </div>
    </LivePageShell>
  );
}

Object.assign(window, { LiveWalkthrough, LiveLog, LiveIssues, LivePageShell, LiveStripedThumb });
