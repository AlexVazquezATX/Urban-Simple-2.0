// Urban Simple redesign — shared tokens, icons, and admin chrome
// Exports to window: UST (tokens), USIcon, USSidebar, USTopBar, USCard, USEmpty

const USTDark = {
  // Dark admin palette — warm near-black + refined gold (night ops)
  bg: "#0F0E0B",
  bgRaised: "#15130F",
  card: "#191713",
  card2: "#1E1B16",
  cardHi: "#23201A",
  border: "#262219",
  borderSoft: "#1F1C16",
  text: "#F3EFE6",
  text2: "#A8A294",
  text3: "#6F6A5E",
  gold: "#E9B84F",
  goldDeep: "#C2932F",
  goldDim: "rgba(233,184,79,0.12)",
  goldLine: "rgba(233,184,79,0.25)",
  teal: "#52D6C3",
  tealDim: "rgba(82,214,195,0.12)",
  tealLine: "rgba(82,214,195,0.25)",
  coral: "#F08070",
  coralDim: "rgba(240,128,112,0.12)",
  coralLine: "rgba(240,128,112,0.25)",
  green: "#8FCC85",
  greenDim: "rgba(143,204,133,0.12)",
  greenLine: "rgba(143,204,133,0.25)",
  onAccent: "#191407",
  modeLabel: "Light mode",
  modeIcon: "sun",
  display: "'Bricolage Grotesque', sans-serif",
  body: "'Instrument Sans', sans-serif",
  mono: "'Spline Sans Mono', monospace",
};

const USTLight = {
  // Light admin palette — warm cream + brass, harmonized with the client portal (daytime review)
  bg: "#F6F2E8",
  bgRaised: "#FCFAF5",
  card: "#FFFFFF",
  card2: "#F3EEE0",
  cardHi: "#ECE6D4",
  border: "#E4DCC6",
  borderSoft: "#ECE6D6",
  text: "#211C12",
  text2: "#6E6655",
  text3: "#9C937E",
  gold: "#9C7418",
  goldDeep: "#7E5D12",
  goldDim: "rgba(156,116,24,0.10)",
  goldLine: "rgba(156,116,24,0.30)",
  teal: "#2E7D6E",
  tealDim: "rgba(46,125,110,0.10)",
  tealLine: "rgba(46,125,110,0.30)",
  coral: "#B3502E",
  coralDim: "rgba(179,80,46,0.10)",
  coralLine: "rgba(179,80,46,0.30)",
  green: "#4E7D47",
  greenDim: "rgba(78,125,71,0.12)",
  greenLine: "rgba(78,125,71,0.30)",
  onAccent: "#FCFAF5",
  modeLabel: "Dark mode",
  modeIcon: "moon",
  display: "'Bricolage Grotesque', sans-serif",
  body: "'Instrument Sans', sans-serif",
  mono: "'Spline Sans Mono', monospace",
};

// UST is a live proxy onto the active theme — USThemed swaps it per subtree.
const USThemes = { dark: USTDark, light: USTLight };
let USActiveThemeName = "dark";
const UST = new Proxy({}, {
  get: (_, key) => USThemes[USActiveThemeName][key],
});
function USThemed({ theme = "dark", children }) {
  USActiveThemeName = theme;
  return children;
}

// ---------- tiny icon set (simple strokes only) ----------
const USIconPaths = {
  grid: <g><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></g>,
  check: <g><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 12.5l2.5 2.5L16 9.5"/></g>,
  calendar: <g><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></g>,
  users: <g><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.5a3.5 3.5 0 010 6.5M17.5 14.8c2.1.7 3.5 2.4 3.5 4.7"/></g>,
  pin: <g><path d="M12 21s-7-5.5-7-11a7 7 0 1114 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></g>,
  trend: <g><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></g>,
  mail: <g><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 8l9 6 9-6"/></g>,
  search: <g><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></g>,
  spark: <g><path d="M12 3l1.8 5.7L19.5 10l-5.7 1.8L12 17.5l-1.8-5.7L4.5 10l5.7-1.3L12 3z"/></g>,
  dollar: <g><circle cx="12" cy="12" r="9"/><path d="M12 7v10M14.7 9.2c-.5-1-1.5-1.5-2.7-1.5-1.5 0-2.7.9-2.7 2.1 0 2.9 5.6 1.5 5.6 4.4 0 1.2-1.3 2.1-2.9 2.1-1.4 0-2.5-.6-3-1.7"/></g>,
  file: <g><path d="M6 3h8l4 4v14H6V3z"/><path d="M14 3v4h4"/></g>,
  repeat: <g><path d="M4 9a5 5 0 015-5h10"/><path d="M16 1l3 3-3 3"/><path d="M20 15a5 5 0 01-5 5H5"/><path d="M8 23l-3-3 3-3"/></g>,
  moon: <g><path d="M20 13.5A8 8 0 0110.5 4 8 8 0 1020 13.5z"/></g>,
  bell: <g><path d="M6 10a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 19.5a2.2 2.2 0 004 0"/></g>,
  arrow: <g><path d="M4 12h16"/><path d="M13 5l7 7-7 7"/></g>,
  plus: <g><path d="M12 4v16M4 12h16"/></g>,
  clock: <g><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></g>,
  alert: <g><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v4.5M12 17.8v.2"/></g>,
  star: <g><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.7l5.9-.8L12 3.5z"/></g>,
  chevR: <g><path d="M9 5l7 7-7 7"/></g>,
  chevD: <g><path d="M5 9l7 7 7-7"/></g>,
  camera: <g><rect x="3" y="7" width="18" height="13" rx="3"/><path d="M8.5 7L10 4h4l1.5 3"/><circle cx="12" cy="13" r="3.5"/></g>,
  flag: <g><path d="M5 21V4"/><path d="M5 4h13l-2.5 4L18 12H5"/></g>,
  history: <g><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></g>,
  thumb: <g><path d="M7 11l4-7c1.2 0 2 .9 2 2v4h5.2c1.1 0 1.9 1 1.7 2.1l-1.1 6A2 2 0 0116.8 20H7"/><rect x="3" y="11" width="4" height="9" rx="1"/></g>,
  doc: <g><path d="M6 3h12v18H6V3z"/><path d="M9 8h6M9 12h6M9 16h4"/></g>,
  sun: <g><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3L7 7M17 17l1.7 1.7M18.7 5.3L17 7M7 17l-1.7 1.7"/></g>,
  out: <g><path d="M9 4H5v16h4"/><path d="M13 12h8M18 8.5L21.5 12 18 15.5"/></g>,
  key: <g><circle cx="8" cy="14" r="4.5"/><path d="M11.5 10.5L20 2M16 6l3 3M13 9l2 2"/></g>,
  zap: <g><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></g>,
};

function USIcon({ name, size = 16, color = "currentColor", sw = 1.6, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {USIconPaths[name] || USIconPaths.grid}
    </svg>
  );
}

// ---------- sidebar ----------
const usNavData = [
  { label: "Today", items: [
    { icon: "grid", name: "Dashboard" },
    { icon: "check", name: "Tasks", badge: "3" },
    { icon: "calendar", name: "Daily Planner" },
  ]},
  { label: "Growth", items: [
    { icon: "users", name: "Prospects" },
    { icon: "trend", name: "Pipeline" },
    { icon: "mail", name: "Outreach" },
    { icon: "spark", name: "AI Discovery" },
    { icon: "zap", name: "Creative Hub" },
  ]},
  { label: "Clients", items: [
    { icon: "users", name: "Clients", badge: "18" },
    { icon: "pin", name: "Locations" },
    { icon: "thumb", name: "Feedback" },
  ]},
  { label: "Money", items: [
    { icon: "dollar", name: "Financials" },
    { icon: "file", name: "Billing & AR" },
    { icon: "doc", name: "Invoices" },
    { icon: "repeat", name: "Recurring" },
  ]},
];

function USSidebar({ active = "Dashboard" }) {
  const S = UST;
  return (
    <aside style={{
      width: 228, flexShrink: 0, height: "100%", display: "flex", flexDirection: "column",
      background: S.bgRaised, borderRight: `1px solid ${S.borderSoft}`,
      fontFamily: S.body,
    }}>
      {/* brand */}
      <div style={{ padding: "20px 20px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, background: S.gold, display: "grid", placeItems: "center",
          fontFamily: S.display, fontWeight: 800, fontSize: 16, color: S.onAccent, letterSpacing: "-0.5px",
        }}>US</div>
        <div>
          <div style={{ fontFamily: S.display, fontWeight: 700, fontSize: 15, color: S.text, letterSpacing: "-0.2px", lineHeight: 1.1 }}>
            Urban <span style={{ color: S.gold, fontStyle: "italic", fontWeight: 500 }}>Simple</span>
          </div>
          <div style={{ fontSize: 9, letterSpacing: "1.6px", color: S.text3, fontFamily: S.mono, marginTop: 2 }}>BUSINESS OS</div>
        </div>
      </div>

      {/* command bar */}
      <div style={{ padding: "0 14px 6px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
          background: S.bg, border: `1px solid ${S.border}`, borderRadius: 9,
          color: S.text3, fontSize: 12.5,
        }}>
          <USIcon name="search" size={13} color={UST.text3} />
          <span style={{ flex: 1 }}>Jump to…</span>
          <span style={{ fontFamily: S.mono, fontSize: 10, background: S.card2, border: `1px solid ${S.border}`, borderRadius: 5, padding: "1px 5px" }}>⌘K</span>
        </div>
      </div>

      {/* nav */}
      <nav style={{ flex: 1, padding: "6px 14px", display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
        {usNavData.map((group) => (
          <div key={group.label}>
            <div style={{ fontSize: 9.5, letterSpacing: "1.8px", color: S.text3, fontFamily: S.mono, textTransform: "uppercase", padding: "0 8px 6px" }}>{group.label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {group.items.map((it) => {
                const isActive = it.name === active;
                return (
                  <div key={it.name} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "6.5px 8px",
                    borderRadius: 8, fontSize: 13.5, fontWeight: isActive ? 600 : 450,
                    color: isActive ? S.gold : S.text2,
                    background: isActive ? S.goldDim : "transparent",
                    border: `1px solid ${isActive ? S.goldLine : "transparent"}`,
                  }}>
                    <USIcon name={it.icon} size={15} color={isActive ? S.gold : S.text3} />
                    <span style={{ flex: 1 }}>{it.name}</span>
                    {it.badge ? <span style={{
                      fontFamily: S.mono, fontSize: 10.5, color: isActive ? S.gold : S.text3,
                      background: isActive ? "transparent" : S.card2, borderRadius: 6, padding: "1px 6px",
                    }}>{it.badge}</span> : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* footer / user */}
      <div style={{ padding: 14, borderTop: `1px solid ${S.borderSoft}`, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: S.text3, fontSize: 12.5, padding: "0 4px" }}>
          <USIcon name={S.modeIcon} size={14} color={UST.text3} />
          <span style={{ flex: 1 }}>{S.modeLabel}</span>
          <div style={{ width: 30, height: 17, borderRadius: 10, background: S.card2, border: `1px solid ${S.border}`, position: "relative" }}>
            <div style={{ width: 11, height: 11, borderRadius: 6, background: S.text3, position: "absolute", top: 2, left: 2 }}></div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px", background: S.card, border: `1px solid ${S.border}`, borderRadius: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 14, background: `linear-gradient(135deg, ${S.gold}, ${S.goldDeep})`,
            display: "grid", placeItems: "center", fontFamily: S.display, fontWeight: 700, fontSize: 12, color: S.onAccent,
          }}>A</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: S.text }}>Alex</div>
            <div style={{ fontSize: 10.5, color: S.text3 }}>Super admin</div>
          </div>
          <USIcon name="out" size={14} color={UST.text3} />
        </div>
      </div>
    </aside>
  );
}

// ---------- top bar ----------
function USTopBar({ title, sub, right }) {
  const S = UST;
  return (
    <div style={{
      display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      padding: "26px 32px 18px", fontFamily: S.body,
    }}>
      <div>
        {sub ? <div style={{ fontFamily: S.mono, fontSize: 11, letterSpacing: "1.6px", color: S.gold, textTransform: "uppercase", marginBottom: 8 }}>{sub}</div> : null}
        <h1 style={{ margin: 0, fontFamily: S.display, fontWeight: 700, fontSize: 30, letterSpacing: "-0.8px", color: S.text, lineHeight: 1.05 }}>{title}</h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{right}</div>
    </div>
  );
}

// ---------- primitives ----------
function USCard({ children, style, pad = 20 }) {
  return (
    <div style={{
      background: UST.card, border: `1px solid ${UST.border}`, borderRadius: 14,
      padding: pad, fontFamily: UST.body, ...style,
    }}>{children}</div>
  );
}

function USBtn({ children, kind = "ghost", icon, style }) {
  const S = UST;
  const kinds = {
    gold: { background: S.gold, color: S.onAccent, border: `1px solid ${S.gold}`, fontWeight: 600 },
    ghost: { background: "transparent", color: S.text2, border: `1px solid ${S.border}`, fontWeight: 500 },
    soft: { background: S.card2, color: S.text, border: `1px solid ${S.border}`, fontWeight: 500 },
  };
  return (
    <button style={{
      display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px",
      borderRadius: 9, fontSize: 13, fontFamily: S.body, cursor: "pointer",
      ...kinds[kind], ...style,
    }}>
      {icon ? <USIcon name={icon} size={14} color={kind === "gold" ? S.onAccent : S.text3} /> : null}
      {children}
    </button>
  );
}

function USChip({ children, tone = "neutral", style }) {
  const S = UST;
  const tones = {
    neutral: { color: S.text2, background: S.card2, border: S.border },
    gold: { color: S.gold, background: S.goldDim, border: S.goldLine },
    teal: { color: S.teal, background: S.tealDim, border: S.tealLine },
    coral: { color: S.coral, background: S.coralDim, border: S.coralLine },
    green: { color: S.green, background: S.greenDim, border: S.greenLine },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "2.5px 9px",
      borderRadius: 99, fontSize: 11, fontWeight: 600, letterSpacing: "0.2px",
      color: t.color, background: t.background, border: `1px solid ${t.border}`,
      fontFamily: UST.body, ...style,
    }}>{children}</span>
  );
}

Object.assign(window, { UST, USTDark, USTLight, USThemed, USIcon, USSidebar, USTopBar, USCard, USBtn, USChip });
