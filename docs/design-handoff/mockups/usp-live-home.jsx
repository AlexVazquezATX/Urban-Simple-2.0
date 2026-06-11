// LIVE portal — Home (chosen D layout) + Login
function LiveTimelineRow({ T, time, text, last }) {
  return (
    <div style={{ display: "flex", gap: 16, fontFamily: T.body }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: 4, background: T.accent, marginTop: 5, flexShrink: 0 }}></span>
        {!last ? <span style={{ width: 1, flex: 1, background: T.border }}></span> : null}
      </div>
      <div style={{ paddingBottom: last ? 0 : T.s(16), display: "flex", gap: 14, alignItems: "baseline" }}>
        <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.faint, width: 64, flexShrink: 0 }}>{time}</span>
        <span style={{ fontSize: 14, color: T.ink, lineHeight: 1.4 }}>{text}</span>
      </div>
    </div>
  );
}

function LiveHomeNav({ T, go }) {
  const links = [["home", "Home"], ["walkthrough", "Walkthrough"], ["log", "Log"], ["issues", "Issues"]];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 26, fontFamily: T.body }}>
      <nav style={{ display: "flex", gap: 24, flex: 1 }}>
        {links.map(([id, l], i) => (
          <span key={id} onClick={() => go(id)} style={{
            fontSize: 13, fontWeight: i === 0 ? 650 : 470, color: i === 0 ? T.ink : T.faint, cursor: "pointer",
            borderBottom: i === 0 ? `2px solid ${T.accent}` : "2px solid transparent", paddingBottom: 4,
          }}>{l}</span>
        ))}
      </nav>
      <span onClick={() => go("login")} style={{ fontSize: 12.5, color: T.faint, display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
        <USIcon name="out" size={13} color={T.faint} /> Sign out
      </span>
    </div>
  );
}

function LiveHome({ T, t, go }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: T.body }}>
      <LivePhotoPanel T={T} slotId="pd-hero" pill="Serviced last night · ready for today's service" />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: `${T.s(34)}px clamp(36px, 4.5vw, 72px) ${T.s(38)}px` }}>
        <div style={{ marginBottom: T.s(36) }}><LiveHomeNav T={T} go={go} /></div>
        <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: "2.4px", color: T.accent, marginBottom: 12 }}>TUESDAY · JUNE 10</div>
        <h2 style={{ margin: 0, fontFamily: T.display, fontWeight: 700, fontSize: T.s(40), letterSpacing: "-1.2px", color: T.ink, lineHeight: 1.05 }}>Good morning, Alex.</h2>
        <p style={{ margin: "13px 0 0", fontSize: 15, color: T.sub, lineHeight: 1.55, maxWidth: 470 }}>
          Marco's crew finished at 4:12 AM — fourteen photos and two notes are waiting in your log.
        </p>

        {t.showStreak ? (
          <div style={{ display: "flex", gap: 12, marginTop: T.s(24) }}>
            <LiveStatTile T={T} palette="sage" label="KITCHEN STATUS" value="Sparkling ✦" sub="11 visits in a row, every zone passed" />
            <LiveStatTile T={T} palette="sky" label="NEXT VISIT" value="Thu · 11 PM" sub="Hood line and walk-in are on the list" />
          </div>
        ) : null}

        <div style={{ margin: `${T.s(16)}px 0 0`, padding: `${T.s(20)}px ${T.s(24)}px`, background: T.panel, borderRadius: 16 }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: "2px", color: T.faint, marginBottom: 14 }}>LAST NIGHT</div>
          <LiveTimelineRow T={T} time="11:02 PM" text="Crew of 3 arrived — Marco leading" />
          <LiveTimelineRow T={T} time="1:48 AM" text="Hood line degreased · 9 photos added" />
          <LiveTimelineRow T={T} time="4:12 AM" text="Walkthrough complete — kitchen locked up" last />
        </div>

        <div style={{ marginTop: T.s(8) }}>
          <LiveActionRow T={T} icon="camera" title="Start a walkthrough" sub="Photo + note capture by zone" onClick={() => go("walkthrough")} />
          <LiveActionRow T={T} icon="flag" title="Report something" sub="Flag what needs attention" onClick={() => go("issues")} />
        </div>

        <div style={{ marginTop: T.s(18) }}>
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 10 }}>
            <span style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: "2px", color: T.faint }}>LAST NIGHT, IN PHOTOS</span>
            <span onClick={() => go("log")} style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 600, color: T.accent, cursor: "pointer" }}>See all 14 →</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {["g1", "g2", "g3"].map((id) => (
              <image-slot key={id} id={`pd-${id}`} radius="12" placeholder="visit photo" style={{ width: "100%", height: T.s(104) }}></image-slot>
            ))}
          </div>
        </div>

        <LiveManager T={T} />
      </div>
    </div>
  );
}

function LiveField({ T, label, value, type }) {
  return (
    <label style={{ display: "block", fontFamily: T.body }}>
      <div style={{ fontFamily: T.mono, fontSize: 9.5, letterSpacing: "1.8px", color: T.faint, marginBottom: 7 }}>{label}</div>
      <input type={type || "text"} defaultValue={value} style={{
        width: "100%", padding: "13px 16px", borderRadius: 12, border: `1px solid ${T.border}`,
        background: T.card, fontSize: 14.5, fontFamily: T.body, color: T.ink, outline: "none",
      }} />
    </label>
  );
}

function LiveLogin({ T, go }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: T.body }}>
      <LivePhotoPanel T={T} slotId="pd-hero" pill="We clean while you sleep" />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px clamp(48px, 7vw, 120px)" }}>
        <div style={{ maxWidth: 400 }}>
          <div style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: "2.4px", color: T.accent, marginBottom: 14 }}>NECTARINE · CLIENT PORTAL</div>
          <h1 style={{ margin: 0, fontFamily: T.display, fontWeight: 700, fontSize: 42, letterSpacing: "-1.3px", color: T.ink, lineHeight: 1.04 }}>Welcome back.</h1>
          <p style={{ margin: "14px 0 0", fontSize: 15, color: T.sub, lineHeight: 1.55 }}>
            Sign in to see last night's visit, photos, and what's scheduled next.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 34 }}>
            <LiveField T={T} label="EMAIL" value="alex@nectarine.kitchen" />
            <LiveField T={T} label="PASSWORD" value="password" type="password" />
          </div>
          <button onClick={() => go("home")} style={{
            width: "100%", marginTop: 24, padding: "14px 20px", borderRadius: 99,
            background: T.accent, color: "#FCFAF5", border: "none", fontSize: 15,
            fontFamily: T.body, fontWeight: 650, cursor: "pointer",
          }}>Sign in</button>
          <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: T.faint }}>
            Forgot your password? <span style={{ color: T.accent, fontWeight: 600, cursor: "pointer" }}>Email me a magic link</span>
          </div>
          <div style={{ marginTop: 56, paddingTop: 20, borderTop: `1px solid ${T.border}`, fontFamily: T.mono, fontSize: 10, letterSpacing: "1.8px", color: T.faint }}>
            URBAN SIMPLE · WE CLEAN WHILE YOU SLEEP
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LiveHome, LiveLogin, LiveTimelineRow });
