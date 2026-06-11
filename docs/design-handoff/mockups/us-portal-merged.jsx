// Client portal — three B+C merges
// D "Quiet merge":  Concierge layout + compact status/next-visit tiles
// E "Split bento":  Concierge photo + Daybreak's full bento as the right column
// F "Storyboard":   timeline lives ON the photo; right side gets streak + photo strip

// shared photo panel (left side)
function USPMPhoto({ slotId, pill, timeline }) {
  const B = USPB;
  return (
    <div style={{ width: 600, flexShrink: 0, position: "relative" }}>
      <image-slot id={slotId} shape="rect" placeholder="Full-height photo — Nectarine's kitchen" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}></image-slot>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(18,14,6,0.38), transparent 30%, transparent 55%, rgba(18,14,6,0.62))", pointerEvents: "none" }}></div>
      <div style={{ position: "absolute", top: 30, left: 34, display: "flex", alignItems: "center", gap: 11, pointerEvents: "none" }}>
        <div style={{ width: 34, height: 34, borderRadius: 17, background: "rgba(252,250,245,0.92)", display: "grid", placeItems: "center", fontFamily: B.display, fontWeight: 800, fontSize: 14, color: B.ink }}>N</div>
        <div>
          <div style={{ fontFamily: B.display, fontWeight: 700, fontSize: 15, color: "#FCFAF5", letterSpacing: "-0.2px" }}>Nectarine</div>
          <div style={{ fontFamily: B.mono, fontSize: 9, letterSpacing: "1.8px", color: "rgba(252,250,245,0.7)" }}>URBAN SIMPLE PORTAL</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 34, right: 34, bottom: 30, pointerEvents: "none", display: "flex", flexDirection: "column", gap: 14 }}>
        {timeline ? (
          <div style={{ padding: "20px 24px", borderRadius: 16, background: "rgba(18,14,6,0.62)", border: "1px solid rgba(252,250,245,0.18)", backdropFilter: "blur(6px)" }}>
            <div style={{ fontFamily: B.mono, fontSize: 10, letterSpacing: "2px", color: "rgba(252,250,245,0.6)", marginBottom: 14 }}>LAST NIGHT</div>
            {[
              ["11:02 PM", "Crew of 3 arrived — Marco leading"],
              ["1:48 AM", "Hood line degreased · 9 photos added"],
              ["4:12 AM", "Walkthrough complete — locked up"],
            ].map(([t, txt], i) => (
              <div key={t} style={{ display: "flex", gap: 12, alignItems: "baseline", paddingBottom: i < 2 ? 11 : 0 }}>
                <span style={{ width: 7, height: 7, borderRadius: 4, background: "#E9B84F", flexShrink: 0, alignSelf: "center" }}></span>
                <span style={{ fontFamily: B.mono, fontSize: 11, color: "rgba(252,250,245,0.65)", width: 60, flexShrink: 0 }}>{t}</span>
                <span style={{ fontSize: 13, color: "#FCFAF5" }}>{txt}</span>
              </div>
            ))}
          </div>
        ) : null}
        {pill ? (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 99, background: "rgba(18,14,6,0.55)", border: "1px solid rgba(252,250,245,0.25)", alignSelf: "flex-start" }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: "#9FD08F" }}></span>
            <span style={{ fontSize: 12.5, color: "#FCFAF5", fontWeight: 500 }}>{pill}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function USPMNav() {
  const B = USPB;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
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
  );
}

function USPMManager({ compact }) {
  const B = USPB;
  return (
    <div style={{ marginTop: "auto", paddingTop: compact ? 20 : 26, display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 20, background: B.goldBg, display: "grid", placeItems: "center", fontFamily: B.display, fontWeight: 700, fontSize: 14, color: B.gold }}>M</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 650, color: B.ink }}>Marco · your account manager</div>
        <div style={{ fontSize: 12, color: B.faint }}>Usually replies within the hour</div>
      </div>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 99, border: `1px solid ${B.border}`, fontSize: 13, fontWeight: 600, color: B.ink }}>
        <USIcon name="mail" size={14} color={USPB.gold} /> Email us
      </span>
    </div>
  );
}

// small pastel stat tile (from C, compacted)
function USPMStatTile({ bg, border, deep, label, value, sub }) {
  return (
    <div style={{ flex: 1, background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: "16px 20px" }}>
      <div style={{ fontFamily: USPB.mono, fontSize: 9.5, letterSpacing: "1.8px", color: deep, opacity: 0.75 }}>{label}</div>
      <div style={{ fontFamily: USPB.display, fontWeight: 700, fontSize: 21, letterSpacing: "-0.4px", color: deep, margin: "8px 0 3px" }}>{value}</div>
      <div style={{ fontSize: 12, color: deep, opacity: 0.85, lineHeight: 1.4 }}>{sub}</div>
    </div>
  );
}

// ---------------- D · QUIET MERGE ----------------
function USPortalMergeQuiet() {
  const B = USPB;
  return (
    <div style={{ width: 1440, height: "100%", display: "flex", background: B.bg, fontFamily: B.body, overflow: "hidden" }}>
      <USPMPhoto slotId="pd-hero" pill="Serviced last night · ready for today's service" />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "34px 64px 38px" }}>
        <div style={{ marginBottom: 38 }}><USPMNav /></div>
        <div style={{ fontFamily: B.mono, fontSize: 11, letterSpacing: "2.4px", color: B.gold, marginBottom: 12 }}>TUESDAY · JUNE 10</div>
        <h2 style={{ margin: 0, fontFamily: B.display, fontWeight: 700, fontSize: 40, letterSpacing: "-1.2px", color: B.ink, lineHeight: 1.05 }}>Good morning, Alex.</h2>
        <p style={{ margin: "13px 0 0", fontSize: 15, color: B.sub, lineHeight: 1.55, maxWidth: 470 }}>
          Marco's crew finished at 4:12 AM — fourteen photos and two notes are waiting in your log.
        </p>

        {/* C's stat tiles, compacted */}
        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <USPMStatTile bg={USPC.sage} border="#D3DFC6" deep={USPC.sageDeep} label="KITCHEN STATUS" value="Sparkling ✦" sub="11 visits in a row, every zone passed" />
          <USPMStatTile bg={USPC.sky} border="#CEDDE1" deep={USPC.skyDeep} label="NEXT VISIT" value="Thu · 11 PM" sub="Hood line and walk-in are on the list" />
        </div>

        {/* timeline */}
        <div style={{ margin: "16px 0 0", padding: "20px 24px", background: B.panel, borderRadius: 16 }}>
          <div style={{ fontFamily: B.mono, fontSize: 10, letterSpacing: "2px", color: B.faint, marginBottom: 14 }}>LAST NIGHT</div>
          <USPBTimelineRow time="11:02 PM" text="Crew of 3 arrived — Marco leading" />
          <USPBTimelineRow time="1:48 AM" text="Hood line degreased · 9 photos added" />
          <USPBTimelineRow time="4:12 AM" text="Walkthrough complete — kitchen locked up" last />
        </div>

        {/* actions */}
        <div style={{ marginTop: 8 }}>
          <USPBActionRow icon="camera" title="Start a walkthrough" sub="Photo + note capture by zone" />
          <USPBActionRow icon="flag" title="Report something" sub="Flag what needs attention" />
        </div>

        {/* last night, in photos */}
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 10 }}>
            <span style={{ fontFamily: B.mono, fontSize: 10, letterSpacing: "2px", color: B.faint }}>LAST NIGHT, IN PHOTOS</span>
            <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 600, color: B.gold }}>See all 14 →</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {["g1", "g2", "g3"].map((id) => (
              <image-slot key={id} id={`pd-${id}`} radius="12" placeholder="visit photo" style={{ width: "100%", height: 104 }}></image-slot>
            ))}
          </div>
        </div>

        <USPMManager />
      </div>
    </div>
  );
}

// ---------------- E · SPLIT BENTO ----------------
function USPMActionTileSm({ bg, border, deep, icon, title, sub }) {
  return (
    <div style={{ flex: 1, position: "relative", background: bg, border: `1px solid ${border}`, borderRadius: 18, padding: "20px 22px" }}>
      <div style={{ width: 42, height: 42, borderRadius: 21, background: "rgba(255,255,255,0.75)", display: "grid", placeItems: "center", marginBottom: 30 }}>
        <USIcon name={icon} size={18} color={deep} sw={1.7} />
      </div>
      <div style={{ fontFamily: USPB.display, fontWeight: 700, fontSize: 18, letterSpacing: "-0.4px", color: deep }}>{title}</div>
      <div style={{ fontSize: 12.5, color: deep, opacity: 0.8, marginTop: 3 }}>{sub}</div>
      <div style={{ position: "absolute", top: 20, right: 20 }}><USIcon name="arrow" size={16} color={deep} /></div>
    </div>
  );
}

function USPortalMergeBento() {
  const B = USPB;
  const C = USPC;
  return (
    <div style={{ width: 1440, height: "100%", display: "flex", background: C.bg, fontFamily: B.body, overflow: "hidden" }}>
      <USPMPhoto slotId="pe-hero" pill="Serviced last night · ready for today's service" />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "34px 56px 38px" }}>
        <div style={{ marginBottom: 32 }}><USPMNav /></div>
        <div style={{ fontFamily: B.mono, fontSize: 11, letterSpacing: "2.4px", color: B.gold, marginBottom: 10 }}>TUESDAY · JUNE 10</div>
        <h2 style={{ margin: 0, fontFamily: B.display, fontWeight: 700, fontSize: 36, letterSpacing: "-1px", color: C.ink, lineHeight: 1.06 }}>Good morning, Alex.</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 24, flex: 1 }}>
          {/* stat tiles */}
          <div style={{ display: "flex", gap: 14 }}>
            <USPMStatTile bg={C.sage} border="#D3DFC6" deep={C.sageDeep} label="KITCHEN STATUS" value="Sparkling ✦" sub="11 visits in a row, every zone passed" />
            <USPMStatTile bg={C.sky} border="#CEDDE1" deep={C.skyDeep} label="NEXT VISIT" value="Thu · 11 PM" sub="Marco's crew of 3 — hood line + walk-in" />
          </div>

          {/* action tiles */}
          <div style={{ display: "flex", gap: 14 }}>
            <USPMActionTileSm bg={C.goldTile} border="#E7D5A6" deep={C.goldDeep} icon="camera" title="Start a walkthrough" sub="Photo + note capture by zone" />
            <USPMActionTileSm bg={C.peach} border="#EDD2BC" deep={C.peachDeep} icon="flag" title="Report something" sub="Flag it — we'll handle it tonight" />
          </div>

          {/* photos */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: B.display, fontWeight: 700, fontSize: 16.5, letterSpacing: "-0.3px", color: C.ink }}>Last night, in photos</div>
                <div style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>14 photos · completed 4:12 AM</div>
              </div>
              <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 600, color: C.gold }}>See the log →</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {["g1", "g2", "g3"].map((id) => (
                <image-slot key={id} id={`pe-${id}`} radius="12" placeholder="visit photo" style={{ width: "100%", height: 118 }}></image-slot>
              ))}
            </div>
          </div>
        </div>

        <USPMManager compact />
      </div>
    </div>
  );
}

// ---------------- F · STORYBOARD ----------------
function USPortalMergeStory() {
  const B = USPB;
  const C = USPC;
  return (
    <div style={{ width: 1440, height: "100%", display: "flex", background: B.bg, fontFamily: B.body, overflow: "hidden" }}>
      <USPMPhoto slotId="pf-hero" timeline />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "34px 64px 38px" }}>
        <div style={{ marginBottom: 40 }}><USPMNav /></div>
        <div style={{ fontFamily: B.mono, fontSize: 11, letterSpacing: "2.4px", color: B.gold, marginBottom: 12 }}>TUESDAY · JUNE 10</div>
        <h2 style={{ margin: 0, fontFamily: B.display, fontWeight: 700, fontSize: 40, letterSpacing: "-1.2px", color: B.ink, lineHeight: 1.05 }}>Good morning, Alex.</h2>
        <p style={{ margin: "13px 0 0", fontSize: 15, color: B.sub, lineHeight: 1.55, maxWidth: 470 }}>
          Marco's crew finished at 4:12 AM — the full story of last night is on the left.
        </p>

        {/* streak banner */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 26, padding: "15px 20px", background: C.sage, border: "1px solid #D3DFC6", borderRadius: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: "rgba(255,255,255,0.7)", display: "grid", placeItems: "center" }}>
            <USIcon name="check" size={16} color={C.sageDeep} sw={1.9} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontFamily: B.display, fontWeight: 700, fontSize: 15.5, color: C.sageDeep }}>Sparkling ✦ </span>
            <span style={{ fontSize: 13, color: C.sageDeep, opacity: 0.9 }}>— 11 visits in a row with every zone passed.</span>
          </div>
          <span style={{ fontFamily: B.mono, fontSize: 11, color: C.sageDeep, opacity: 0.75 }}>NEXT: THU · 11 PM</span>
        </div>

        {/* photo strip */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 10 }}>
            <span style={{ fontFamily: B.mono, fontSize: 10, letterSpacing: "2px", color: B.faint }}>LAST NIGHT, IN PHOTOS</span>
            <span style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 600, color: B.gold }}>See all 14 →</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {["g1", "g2", "g3"].map((id) => (
              <image-slot key={id} id={`pf-${id}`} radius="12" placeholder="visit photo" style={{ width: "100%", height: 110 }}></image-slot>
            ))}
          </div>
        </div>

        {/* actions */}
        <div style={{ marginTop: 8 }}>
          <USPBActionRow icon="camera" title="Start a walkthrough" sub="Photo + note capture by zone" />
          <USPBActionRow icon="flag" title="Report something" sub="Flag what needs attention" />
        </div>

        <USPMManager />
      </div>
    </div>
  );
}

Object.assign(window, { USPortalMergeQuiet, USPortalMergeBento, USPortalMergeStory });
