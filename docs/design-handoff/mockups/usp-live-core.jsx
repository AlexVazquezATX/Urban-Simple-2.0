// Urban Simple Portal LIVE — theme + shared shell
// Exports: makePortalTheme, LiveNav, LivePhotoPanel, LiveStatTile, LiveActionRow,
//          LiveManager, LivePageHead, LiveBtn

function makePortalTheme(t) {
  const accent = t.accent || "#9C7418";
  const f = t.density === "cozy" ? 0.88 : 1;
  return {
    bg: "#FCFAF5",
    panel: "#F4EFE4",
    card: "#FFFFFF",
    ink: "#1E1A12",
    sub: "#6E6655",
    faint: "#9C937E",
    border: "#E6DEC9",
    accent,
    accentBg: `color-mix(in oklab, ${accent} 13%, #FCFAF5)`,
    accentLine: `color-mix(in oklab, ${accent} 30%, #FCFAF5)`,
    sage: "#E3EBD9", sageDeep: "#46663C", sageLine: "#D3DFC6",
    sky: "#DFE9EC", skyDeep: "#3E6470", skyLine: "#CEDDE1",
    coral: "#F4E0D6", coralDeep: "#9E4A26", coralLine: "#EDD2BC",
    display: "'Bricolage Grotesque', sans-serif",
    body: "'Instrument Sans', sans-serif",
    mono: "'Spline Sans Mono', monospace",
    s: (x) => Math.round(x * f),
    overlay: (t.overlay != null ? t.overlay : 55) / 100,
  };
}

function LiveBtn({ T, children, icon, primary, onClick, style }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px",
      borderRadius: 99, fontSize: 13.5, fontFamily: T.body, fontWeight: 600, cursor: "pointer",
      background: primary ? T.accent : "transparent",
      color: primary ? "#FCFAF5" : T.ink,
      border: `1px solid ${primary ? T.accent : T.border}`,
      ...style,
    }}>
      {icon ? <USIcon name={icon} size={14} color={primary ? "#FCFAF5" : T.accent} /> : null}
      {children}
    </button>
  );
}

// top bar for inner pages
function LiveNav({ T, page, go }) {
  const links = [
    ["home", "Home"], ["walkthrough", "Walkthrough"], ["log", "Cleaning log"], ["issues", "Issues"],
  ];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 24, padding: "16px 48px",
      background: T.bg, borderBottom: `1px solid ${T.border}`,
      position: "sticky", top: 0, zIndex: 20, fontFamily: T.body,
    }}>
      <div onClick={() => go("home")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <div style={{ width: 32, height: 32, borderRadius: 16, background: T.accentBg, border: `1px solid ${T.accentLine}`, display: "grid", placeItems: "center", fontFamily: T.display, fontWeight: 800, fontSize: 13.5, color: T.accent }}>N</div>
        <div>
          <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 14.5, color: T.ink, letterSpacing: "-0.2px", lineHeight: 1.1 }}>Nectarine</div>
          <div style={{ fontFamily: T.mono, fontSize: 8.5, letterSpacing: "1.6px", color: T.faint }}>URBAN SIMPLE PORTAL</div>
        </div>
      </div>
      <nav style={{ display: "flex", gap: 22, marginLeft: 26, flex: 1 }}>
        {links.map(([id, label]) => (
          <span key={id} onClick={() => go(id)} style={{
            fontSize: 13.5, fontWeight: page === id ? 650 : 470, cursor: "pointer",
            color: page === id ? T.ink : T.faint,
            borderBottom: page === id ? `2px solid ${T.accent}` : "2px solid transparent",
            paddingBottom: 4, marginBottom: -6,
          }}>{label}</span>
        ))}
      </nav>
      <span onClick={() => go("login")} style={{ fontSize: 13, color: T.faint, display: "inline-flex", gap: 7, alignItems: "center", cursor: "pointer" }}>
        <USIcon name="out" size={14} color={T.faint} /> Sign out
      </span>
    </div>
  );
}

// left photo panel (home + login)
function LivePhotoPanel({ T, slotId, pill, children }) {
  return (
    <div style={{ width: "clamp(360px, 42vw, 640px)", flexShrink: 0, position: "relative", minHeight: "100vh" }}>
      <image-slot id={slotId} shape="rect" placeholder="Full-height photo — your kitchen at its best" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}></image-slot>
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `linear-gradient(180deg, rgba(18,14,6,${0.38 * T.overlay / 0.55}), transparent 30%, transparent 55%, rgba(18,14,6,${T.overlay}))`,
      }}></div>
      <div style={{ position: "absolute", top: 30, left: 34, display: "flex", alignItems: "center", gap: 11, pointerEvents: "none" }}>
        <div style={{ width: 34, height: 34, borderRadius: 17, background: "rgba(252,250,245,0.92)", display: "grid", placeItems: "center", fontFamily: T.display, fontWeight: 800, fontSize: 14, color: T.ink }}>N</div>
        <div>
          <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: 15, color: "#FCFAF5", letterSpacing: "-0.2px" }}>Nectarine</div>
          <div style={{ fontFamily: T.mono, fontSize: 9, letterSpacing: "1.8px", color: "rgba(252,250,245,0.7)" }}>URBAN SIMPLE PORTAL</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 34, right: 34, bottom: 30, display: "flex", flexDirection: "column", gap: 14, pointerEvents: "none" }}>
        {pill ? (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 99, background: "rgba(18,14,6,0.55)", border: "1px solid rgba(252,250,245,0.25)", alignSelf: "flex-start" }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: "#9FD08F" }}></span>
            <span style={{ fontSize: 12.5, color: "#FCFAF5", fontWeight: 500, fontFamily: T.body }}>{pill}</span>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

function LiveStatTile({ T, palette, label, value, sub }) {
  const map = {
    sage: [T.sage, T.sageLine, T.sageDeep],
    sky: [T.sky, T.skyLine, T.skyDeep],
    coral: [T.coral, T.coralLine, T.coralDeep],
    accent: [T.accentBg, T.accentLine, T.accent],
  };
  const [bg, line, deep] = map[palette] || map.sage;
  return (
    <div style={{ flex: 1, background: bg, border: `1px solid ${line}`, borderRadius: 16, padding: `${T.s(16)}px ${T.s(20)}px`, fontFamily: T.body }}>
      <div style={{ fontFamily: T.mono, fontSize: 9.5, letterSpacing: "1.8px", color: deep, opacity: 0.75 }}>{label}</div>
      <div style={{ fontFamily: T.display, fontWeight: 700, fontSize: T.s(21), letterSpacing: "-0.4px", color: deep, margin: "8px 0 3px" }}>{value}</div>
      <div style={{ fontSize: 12, color: deep, opacity: 0.85, lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
}

function LiveActionRow({ T, icon, title, sub, onClick }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 16, padding: `${T.s(15)}px 4px`, borderBottom: `1px solid ${T.border}`, cursor: "pointer", fontFamily: T.body }}>
      <div style={{ width: 40, height: 40, borderRadius: 20, background: T.accentBg, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <USIcon name={icon} size={17} color={T.accent} sw={1.7} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: T.display, fontWeight: 650, fontSize: 16, color: T.ink, letterSpacing: "-0.2px" }}>{title}</div>
        <div style={{ fontSize: 12.5, color: T.sub, marginTop: 1 }}>{sub}</div>
      </div>
      <USIcon name="arrow" size={15} color={T.faint} />
    </div>
  );
}

function LiveManager({ T }) {
  return (
    <div style={{ marginTop: "auto", paddingTop: T.s(24), display: "flex", alignItems: "center", gap: 14, fontFamily: T.body }}>
      <div style={{ width: 40, height: 40, borderRadius: 20, background: T.accentBg, display: "grid", placeItems: "center", fontFamily: T.display, fontWeight: 700, fontSize: 14, color: T.accent }}>M</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 650, color: T.ink }}>Marco · your account manager</div>
        <div style={{ fontSize: 12, color: T.faint }}>Usually replies within the hour</div>
      </div>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 99, border: `1px solid ${T.border}`, fontSize: 13, fontWeight: 600, color: T.ink, cursor: "pointer" }}>
        <USIcon name="mail" size={14} color={T.accent} /> Email us
      </span>
    </div>
  );
}

function LivePageHead({ T, kicker, title, sub, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginBottom: T.s(26), fontFamily: T.body }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: T.mono, fontSize: 10.5, letterSpacing: "2.4px", color: T.accent, marginBottom: 10 }}>{kicker}</div>
        <h1 style={{ margin: 0, fontFamily: T.display, fontWeight: 700, fontSize: T.s(32), letterSpacing: "-1px", color: T.ink, lineHeight: 1.05 }}>{title}</h1>
        {sub ? <div style={{ fontSize: 14, color: T.sub, marginTop: 8, lineHeight: 1.5 }}>{sub}</div> : null}
      </div>
      {right}
    </div>
  );
}

Object.assign(window, { makePortalTheme, LiveNav, LivePhotoPanel, LiveStatTile, LiveActionRow, LiveManager, LivePageHead, LiveBtn });
