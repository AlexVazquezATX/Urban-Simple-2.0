// Client portal — two alternative directions
// B "Concierge": editorial split-screen, boutique-hotel calm
// C "Daybreak": friendly bento grid, light + colorful

// ---------------- B · CONCIERGE ----------------
const USPB = {
  bg: "#FCFAF5",
  panel: "#F4EFE4",
  ink: "#1E1A12",
  sub: "#6E6655",
  faint: "#9C937E",
  border: "#E6DEC9",
  gold: "#9C7418",
  goldBg: "#F3EAD2",
  green: "#4E7D47",
  display: UST.display, body: UST.body, mono: UST.mono,
};

function USPBTimelineRow({ time, text, last }) {
  const B = USPB;
  return (
    <div style={{ display: "flex", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: 4, background: B.gold, marginTop: 5, flexShrink: 0 }}></span>
        {!last ? <span style={{ width: 1, flex: 1, background: B.border }}></span> : null}
      </div>
      <div style={{ paddingBottom: last ? 0 : 18, display: "flex", gap: 14, alignItems: "baseline" }}>
        <span style={{ fontFamily: B.mono, fontSize: 11.5, color: B.faint, width: 64, flexShrink: 0 }}>{time}</span>
        <span style={{ fontSize: 14, color: B.ink, lineHeight: 1.4 }}>{text}</span>
      </div>
    </div>
  );
}

function USPBActionRow({ icon, title, sub }) {
  const B = USPB;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 4px", borderBottom: `1px solid ${B.border}` }}>
      <div style={{ width: 40, height: 40, borderRadius: 20, background: B.goldBg, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <USIcon name={icon} size={17} color={B.gold} sw={1.7} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: B.display, fontWeight: 650, fontSize: 16, color: B.ink, letterSpacing: "-0.2px" }}>{title}</div>
        <div style={{ fontSize: 12.5, color: B.sub, marginTop: 1 }}>{sub}</div>
      </div>
      <USIcon name="arrow" size={15} color={USPB.faint} />
    </div>
  );
}

function USPortalConcierge() {
  const B = USPB;
  return (
    <div style={{ width: 1440, height: "100%", display: "flex", background: B.bg, fontFamily: B.body, overflow: "hidden" }}>
      {/* photo panel */}
      <div style={{ width: 620, flexShrink: 0, position: "relative" }}>
        <image-slot id="pb-hero" shape="rect" placeholder="Full-height photo — Nectarine's kitchen or plated dish" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}></image-slot>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(18,14,6,0.35), transparent 30%, transparent 62%, rgba(18,14,6,0.55))", pointerEvents: "none" }}></div>
        <div style={{ position: "absolute", top: 30, left: 34, display: "flex", alignItems: "center", gap: 11, pointerEvents: "none" }}>
          <div style={{ width: 34, height: 34, borderRadius: 17, background: "rgba(252,250,245,0.92)", display: "grid", placeItems: "center", fontFamily: B.display, fontWeight: 800, fontSize: 14, color: B.ink }}>N</div>
          <div>
            <div style={{ fontFamily: B.display, fontWeight: 700, fontSize: 15, color: "#FCFAF5", letterSpacing: "-0.2px" }}>Nectarine</div>
            <div style={{ fontFamily: B.mono, fontSize: 9, letterSpacing: "1.8px", color: "rgba(252,250,245,0.7)" }}>URBAN SIMPLE PORTAL</div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 34, bottom: 30, right: 34, pointerEvents: "none" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 99, background: "rgba(18,14,6,0.55)", border: "1px solid rgba(252,250,245,0.25)" }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: "#9FD08F" }}></span>
            <span style={{ fontSize: 12.5, color: "#FCFAF5", fontWeight: 500 }}>Serviced last night · ready for today's service</span>
          </div>
        </div>
      </div>

      {/* content panel */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "34px 72px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26, marginBottom: 52 }}>
          <nav style={{ display: "flex", gap: 24, flex: 1 }}>
            {["Home", "Walkthrough", "Log", "Issues", "Documents"].map((l, i) => (
              <span key={l} style={{
                fontSize: 13, fontWeight: i === 0 ? 650 : 470, color: i === 0 ? B.ink : B.faint,
                borderBottom: i === 0 ? `2px solid ${B.gold}` : "2px solid transparent", paddingBottom: 4,
              }}>{l}</span>
            ))}
          </nav>
          <span style={{ fontSize: 12.5, color: B.faint, display: "inline-flex", gap: 6, alignItems: "center" }}><USIcon name="out" size={13} color={USPB.faint} /> Sign out</span>
        </div>

        <div style={{ fontFamily: B.mono, fontSize: 11, letterSpacing: "2.4px", color: B.gold, marginBottom: 14 }}>TUESDAY · JUNE 10</div>
        <h2 style={{ margin: 0, fontFamily: B.display, fontWeight: 700, fontSize: 44, letterSpacing: "-1.4px", color: B.ink, lineHeight: 1.04 }}>Good morning,<br/>Alex.</h2>
        <p style={{ margin: "16px 0 0", fontSize: 15.5, color: B.sub, lineHeight: 1.55, maxWidth: 460 }}>
          Marco's crew finished at 4:12 AM — hood line, fryers, and floors. Fourteen photos and two notes are waiting in your log.
        </p>

        {/* timeline */}
        <div style={{ margin: "36px 0 0", padding: "24px 26px", background: B.panel, borderRadius: 18 }}>
          <div style={{ fontFamily: B.mono, fontSize: 10, letterSpacing: "2px", color: B.faint, marginBottom: 16 }}>LAST NIGHT</div>
          <USPBTimelineRow time="11:02 PM" text="Crew of 3 arrived — Marco leading" />
          <USPBTimelineRow time="1:48 AM" text="Hood line degreased · 9 photos added" />
          <USPBTimelineRow time="4:12 AM" text="Walkthrough complete — kitchen locked up" last />
        </div>

        {/* actions */}
        <div style={{ marginTop: 18 }}>
          <USPBActionRow icon="camera" title="Start a walkthrough" sub="Photo + note capture by zone" />
          <USPBActionRow icon="flag" title="Report something" sub="Flag what needs attention" />
          <USPBActionRow icon="doc" title="Open the cleaning log" sub="Every visit, photographed and noted" />
        </div>

        {/* manager footer */}
        <div style={{ marginTop: "auto", paddingTop: 28, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: B.goldBg, display: "grid", placeItems: "center", fontFamily: B.display, fontWeight: 700, fontSize: 14, color: B.gold }}>M</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 650, color: B.ink }}>Marco · your account manager</div>
            <div style={{ fontSize: 12, color: B.faint }}>Usually replies within the hour</div>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 99, border: `1px solid ${B.border}`, fontSize: 13, fontWeight: 600, color: B.ink }}>
            <USIcon name="mail" size={14} color={USPB.gold} /> Email us
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------- C · DAYBREAK ----------------
const USPC = {
  bg: "#FAF8F3",
  card: "#FFFFFF",
  ink: "#262116",
  sub: "#736B59",
  faint: "#A29983",
  border: "#ECE5D5",
  gold: "#A87C1E",
  goldTile: "#F5E7C6",
  goldDeep: "#7E5E12",
  sage: "#E3EBD9",
  sageDeep: "#46663C",
  peach: "#F8E2D2",
  peachDeep: "#9E5526",
  sky: "#DFE9EC",
  skyDeep: "#3E6470",
  display: UST.display, body: UST.body, mono: UST.mono,
};

function USPCTile({ children, bg, border, style, pad = 26 }) {
  return (
    <div style={{
      background: bg || USPC.card, border: `1px solid ${border || USPC.border}`,
      borderRadius: 24, padding: pad, position: "relative", overflow: "hidden",
      boxShadow: "0 1px 3px rgba(70,58,30,0.05)", ...style,
    }}>{children}</div>
  );
}

function USPCPill({ icon, label }) {
  const C = USPC;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 99, background: C.card, border: `1px solid ${C.border}`, fontSize: 13, fontWeight: 600, color: C.sub }}>
      <USIcon name={icon} size={14} color={USPC.gold} /> {label}
    </span>
  );
}

function USPortalDaybreak() {
  const C = USPC;
  return (
    <div style={{ width: 1440, height: "100%", background: C.bg, fontFamily: C.body, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {/* nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "26px 56px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, flex: 1 }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: C.goldTile, display: "grid", placeItems: "center", fontFamily: C.display, fontWeight: 800, fontSize: 15, color: C.goldDeep }}>N</div>
          <div>
            <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 15.5, color: C.ink, letterSpacing: "-0.2px" }}>Nectarine</div>
            <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: "1.6px", color: C.faint }}>URBAN SIMPLE PORTAL</div>
          </div>
        </div>
        <nav style={{ display: "flex", gap: 2, background: C.card, border: `1px solid ${C.border}`, borderRadius: 99, padding: 4 }}>
          {["Home", "Walkthrough", "Log", "Issues", "Docs", "Team"].map((l, i) => (
            <span key={l} style={{
              fontSize: 13, fontWeight: i === 0 ? 650 : 470, padding: "7px 16px", borderRadius: 99,
              color: i === 0 ? "#FFF" : C.sub, background: i === 0 ? C.ink : "transparent",
            }}>{l}</span>
          ))}
        </nav>
        <span style={{ fontSize: 13, color: C.faint, display: "inline-flex", gap: 7, alignItems: "center", marginLeft: 8 }}><USIcon name="out" size={14} color={USPC.faint} /> Sign out</span>
      </div>

      <div style={{ width: 1100, margin: "10px auto 0", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 18, paddingBottom: 44 }}>
        {/* bento row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: 18 }}>
          <USPCTile pad={38}>
            <div style={{ fontFamily: C.mono, fontSize: 10.5, letterSpacing: "2px", color: C.gold, marginBottom: 14 }}>TUESDAY · JUNE 10</div>
            <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 38, letterSpacing: "-1.1px", color: C.ink, lineHeight: 1.08 }}>Good morning, Alex</div>
            <div style={{ fontSize: 15, color: C.sub, marginTop: 12, lineHeight: 1.55 }}>Your kitchen was serviced last night and everything's ready for today. Next visit is <span style={{ fontWeight: 650, color: C.ink }}>Thursday night</span>.</div>
          </USPCTile>
          <USPCTile bg={C.sage} border="#D3DfC6" pad={30}>
            <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "1.8px", color: C.sageDeep, opacity: 0.75 }}>KITCHEN STATUS</div>
            <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 30, letterSpacing: "-0.7px", color: C.sageDeep, margin: "16px 0 8px" }}>Sparkling ✦</div>
            <div style={{ fontSize: 13, color: C.sageDeep, opacity: 0.85, lineHeight: 1.5 }}>Last night's walkthrough passed every zone — 11 visits in a row.</div>
          </USPCTile>
          <USPCTile bg={C.sky} border="#CEDDE1" pad={30}>
            <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: "1.8px", color: C.skyDeep, opacity: 0.75 }}>NEXT VISIT</div>
            <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 30, letterSpacing: "-0.7px", color: C.skyDeep, margin: "16px 0 8px" }}>Thu · 11 PM</div>
            <div style={{ fontSize: 13, color: C.skyDeep, opacity: 0.85, lineHeight: 1.5 }}>Marco's crew of 3 — hood line and walk-in are on the list.</div>
          </USPCTile>
        </div>

        {/* bento row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 18 }}>
          <USPCTile bg={C.goldTile} border="#E7D5A6" pad={30}>
            <div style={{ width: 48, height: 48, borderRadius: 24, background: "rgba(255,255,255,0.75)", display: "grid", placeItems: "center", marginBottom: 104 }}>
              <USIcon name="camera" size={20} color={USPC.goldDeep} sw={1.7} />
            </div>
            <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 22, letterSpacing: "-0.5px", color: C.goldDeep }}>Start a walkthrough</div>
            <div style={{ fontSize: 13.5, color: C.goldDeep, opacity: 0.8, marginTop: 5 }}>Photo + note capture, zone by zone</div>
            <div style={{ position: "absolute", top: 26, right: 26 }}><USIcon name="arrow" size={17} color={USPC.goldDeep} /></div>
          </USPCTile>
          <USPCTile bg={C.peach} border="#EDD2BC" pad={30}>
            <div style={{ width: 48, height: 48, borderRadius: 24, background: "rgba(255,255,255,0.75)", display: "grid", placeItems: "center", marginBottom: 104 }}>
              <USIcon name="flag" size={19} color={USPC.peachDeep} sw={1.7} />
            </div>
            <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 22, letterSpacing: "-0.5px", color: C.peachDeep }}>Report something</div>
            <div style={{ fontSize: 13.5, color: C.peachDeep, opacity: 0.8, marginTop: 5 }}>Flag it — we'll handle it tonight</div>
            <div style={{ position: "absolute", top: 26, right: 26 }}><USIcon name="arrow" size={17} color={USPC.peachDeep} /></div>
          </USPCTile>
          <USPCTile pad={30}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
              <div>
                <div style={{ fontFamily: C.display, fontWeight: 700, fontSize: 18, letterSpacing: "-0.3px", color: C.ink }}>Last night, in photos</div>
                <div style={{ fontSize: 12.5, color: C.faint, marginTop: 2 }}>14 photos · completed 4:12 AM</div>
              </div>
              <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 600, color: C.gold }}>See all →</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {["g1", "g2", "g3"].map((id) => (
                <image-slot key={id} id={`pc-${id}`} radius="14" placeholder="visit photo" style={{ width: "100%", height: 168 }}></image-slot>
              ))}
            </div>
          </USPCTile>
        </div>

        {/* row 3: quick pills + perk */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <USPCPill icon="doc" label="Cleaning log" />
          <USPCPill icon="history" label="History" />
          <USPCPill icon="file" label="Documents" />
          <USPCPill icon="users" label="Team" />
          <span style={{ flex: 1 }}></span>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 99, background: C.card, border: `1px dashed #E7D5A6` }}>
            <USIcon name="spark" size={14} color={USPC.gold} />
            <span style={{ fontSize: 12.5, color: C.sub }}><span style={{ fontWeight: 650, color: C.ink }}>Free perk:</span> BackHaus food photography — credits on us</span>
            <USIcon name="arrow" size={13} color={USPC.faint} />
          </div>
        </div>

        {/* manager strip */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 26px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: 21, background: C.goldTile, display: "grid", placeItems: "center", fontFamily: C.display, fontWeight: 700, fontSize: 14, color: C.goldDeep }}>M</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 650, color: C.ink }}>Marco · your account manager</div>
            <div style={{ fontSize: 12, color: C.faint }}>Questions? He usually replies within the hour.</div>
          </div>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 99, border: `1px solid ${C.border}`, fontSize: 13, fontWeight: 600, color: C.ink }}>
            <USIcon name="mail" size={14} color={USPC.gold} /> Email us
          </span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { USPortalConcierge, USPortalDaybreak, USPB, USPC, USPBTimelineRow, USPBActionRow, USPCTile });
