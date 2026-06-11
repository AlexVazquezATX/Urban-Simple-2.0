// Client portal redesign — warm, light, hospitality feel
const USP = {
  bg: "#F6F2EA",
  card: "#FFFFFF",
  cardWarm: "#FBF8F1",
  ink: "#211D15",
  sub: "#6F6857",
  faint: "#9A9181",
  border: "#E7DFCE",
  borderSoft: "#EFE9DB",
  gold: "#A87C1E",
  goldDeep: "#8A6516",
  goldBg: "#F6ECD4",
  goldLine: "#E3D2A4",
  green: "#4E7D47",
  greenBg: "#E9F1E4",
  display: UST.display,
  body: UST.body,
  mono: UST.mono,
};

function USPNav() {
  const P = USP;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, padding: "18px 48px", borderBottom: `1px solid ${P.borderSoft}`, background: P.card }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: P.goldBg, border: `1px solid ${P.goldLine}`, display: "grid", placeItems: "center", fontFamily: P.display, fontWeight: 800, fontSize: 15, color: P.goldDeep }}>N</div>
        <div>
          <div style={{ fontFamily: P.display, fontWeight: 700, fontSize: 15, color: P.ink, letterSpacing: "-0.2px" }}>Nectarine</div>
          <div style={{ fontFamily: P.mono, fontSize: 9, letterSpacing: "1.6px", color: P.faint }}>URBAN SIMPLE PORTAL</div>
        </div>
      </div>
      <nav style={{ display: "flex", gap: 4, marginLeft: "auto", alignItems: "center" }}>
        {["Home", "Walkthrough", "Cleaning log", "Issues", "Documents", "Team"].map((l, i) => (
          <span key={l} style={{
            fontSize: 13.5, fontWeight: i === 0 ? 650 : 470, padding: "7px 13px", borderRadius: 99,
            color: i === 0 ? P.goldDeep : P.sub, background: i === 0 ? P.goldBg : "transparent",
          }}>{l}</span>
        ))}
      </nav>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: P.sub }}>
        <USIcon name="out" size={14} color={USP.faint} /> Sign out
      </span>
    </div>
  );
}

function USPActionTile({ icon, title, sub, primary }) {
  const P = USP;
  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", gap: 16, padding: "22px 24px",
      background: primary ? P.goldBg : P.card, border: `1px solid ${primary ? P.goldLine : P.border}`,
      borderRadius: 18, boxShadow: primary ? "none" : "0 1px 2px rgba(60,50,30,0.04)",
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 14, flexShrink: 0, display: "grid", placeItems: "center",
        background: primary ? P.card : P.cardWarm, border: `1px solid ${primary ? P.goldLine : P.borderSoft}`,
      }}>
        <USIcon name={icon} size={20} color={P.goldDeep} sw={1.7} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: P.display, fontWeight: 650, fontSize: 16.5, color: P.ink, letterSpacing: "-0.2px" }}>{title}</div>
        <div style={{ fontSize: 12.5, color: P.sub, marginTop: 2 }}>{sub}</div>
      </div>
      <USIcon name="arrow" size={16} color={USP.faint} />
    </div>
  );
}

function USPQuick({ icon, label }) {
  const P = USP;
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 9,
      padding: "18px 10px", background: P.card, border: `1px solid ${P.border}`, borderRadius: 14,
    }}>
      <USIcon name={icon} size={18} color={P.goldDeep} sw={1.6} />
      <span style={{ fontSize: 12.5, fontWeight: 600, color: P.sub }}>{label}</span>
    </div>
  );
}

function USPortal() {
  const P = USP;
  return (
    <div style={{ width: 1440, minHeight: "100%", background: P.bg, fontFamily: P.body, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <USPNav />
      <div style={{ width: 880, margin: "0 auto", padding: "36px 0 48px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* hero */}
        <div style={{ position: "relative", borderRadius: 22, overflow: "hidden", height: 320 }}>
          <image-slot id="portal-hero" shape="rect" placeholder="Drop a photo of Nectarine's kitchen" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}></image-slot>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,16,8,0.05) 30%, rgba(20,16,8,0.72))", pointerEvents: "none" }}></div>
          <div style={{ position: "absolute", left: 36, right: 36, bottom: 30, pointerEvents: "none" }}>
            <div style={{ fontFamily: P.mono, fontSize: 11, letterSpacing: "2.2px", color: "#EBD9A8", marginBottom: 10 }}>URBAN SIMPLE · YOUR KITCHEN</div>
            <div style={{ fontFamily: P.display, fontWeight: 700, fontSize: 40, letterSpacing: "-1.2px", color: "#FCF9F2", lineHeight: 1.05 }}>Good morning, Alex.</div>
            <div style={{ fontSize: 16, color: "rgba(252,249,242,0.85)", marginTop: 8 }}>Your kitchen was serviced last night — everything's ready for today.</div>
          </div>
        </div>

        {/* last visit summary */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "18px 22px", background: P.card, border: `1px solid ${P.border}`, borderRadius: 18, boxShadow: "0 1px 2px rgba(60,50,30,0.04)" }}>
          <div style={{ width: 42, height: 42, borderRadius: 21, background: P.greenBg, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <USIcon name="check" size={18} color={P.green} sw={1.8} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 650, color: P.ink }}>Last night's visit · completed 4:12 AM</div>
            <div style={{ fontSize: 12.5, color: P.sub, marginTop: 2 }}>Hood line, fryers, and floors — 14 photos and 2 notes from Marco's crew.</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["p1", "p2", "p3"].map((id) => (
              <image-slot key={id} id={`visit-${id}`} radius="10" placeholder="photo" style={{ width: 52, height: 52 }}></image-slot>
            ))}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: P.goldDeep, whiteSpace: "nowrap" }}>See the log →</span>
        </div>

        {/* team strip */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 22px", background: P.cardWarm, border: `1px solid ${P.borderSoft}`, borderRadius: 18 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: `linear-gradient(135deg, ${P.goldBg}, ${P.goldLine})`, display: "grid", placeItems: "center", fontFamily: P.display, fontWeight: 700, fontSize: 15, color: P.goldDeep, flexShrink: 0 }}>M</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: P.mono, fontSize: 9.5, letterSpacing: "1.8px", color: P.faint }}>YOUR TEAM</div>
            <div style={{ fontSize: 14.5, fontWeight: 650, color: P.ink, marginTop: 2 }}>Marco · Urban Simple</div>
            <div style={{ fontSize: 12, color: P.sub }}>Your account manager — usually replies within the hour</div>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 99, border: `1px solid ${P.border}`, background: P.card, fontSize: 13, fontWeight: 600, color: P.ink }}>
            <USIcon name="mail" size={14} color={USP.goldDeep} /> Email us
          </span>
        </div>

        {/* primary actions */}
        <div style={{ display: "flex", gap: 14 }}>
          <USPActionTile primary icon="camera" title="Start a walkthrough" sub="Photo + note capture by zone" />
          <USPActionTile icon="flag" title="Report something" sub="Flag what needs attention" />
        </div>

        {/* more */}
        <div>
          <div style={{ fontFamily: P.mono, fontSize: 10, letterSpacing: "2px", color: P.faint, margin: "8px 2px 10px" }}>MORE</div>
          <div style={{ display: "flex", gap: 12 }}>
            <USPQuick icon="doc" label="Cleaning log" />
            <USPQuick icon="history" label="History" />
            <USPQuick icon="file" label="Documents" />
            <USPQuick icon="users" label="Team" />
          </div>
        </div>

        {/* perk */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 22px", background: P.card, border: `1px dashed ${P.goldLine}`, borderRadius: 16 }}>
          <USIcon name="spark" size={16} color={USP.goldDeep} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13.5, fontWeight: 650, color: P.ink }}>Free perk: BackHaus food photography. </span>
            <span style={{ fontSize: 13, color: P.sub }}>Menu-ready images from your phone snaps — credits on us.</span>
          </div>
          <USIcon name="arrow" size={15} color={USP.faint} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { USPortal });
