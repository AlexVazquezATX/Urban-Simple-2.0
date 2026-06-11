# 02 · Component Rules — anchored to `src/components/ui/`

Each spec: what changes, where, and the do/don't that keeps screen #28 looking like screen #1.

## Button — `ui/button.tsx`
- **Replace the `lime` variant with `gold`:** `bg-primary text-primary-foreground font-semibold hover:bg-primary/90` (primary token is already gold after Phase 0; keep a `gold` alias so call sites read clearly). Radius 9px, height 36px (default), pill NOT allowed on admin (pills are portal-only buttons).
- Variant usage rules: **one gold button per view region, max.** Secondary actions = `outline`; tertiary = `ghost`. `destructive` appears ONLY inside confirm dialogs — never inline in tables/cards.
- Icon buttons: 16px lucide icon, `size="icon-sm"` in table rows.

## Badge → "Chip" — `ui/badge.tsx`
Add five soft tones (the entire pill zoo collapses into these):
```
neutral: text-muted-foreground bg-secondary border-border
gold:    text/border/bg from accent (10–12% fill, 25–30% border)
teal:    informational (Published, En route, info)
coral:   attention (overdue, flagged, urgent, "Never reviewed")
green:   success (Active, Confirmed, Complete)
```
Shape: 999 radius, 11px font-weight 600, padding 2.5px 9px. **Mapping:** `urgent`→coral · `HOT`→gold · `draft`→neutral · `Published`→teal · `active`→green · `AI`→gold w/ spark icon · role pills (Super Admin/Admin/Manager/Associate)→gold/gold/teal/neutral · plan pills (TRIAL/PROFESSIONAL/Comp)→neutral/gold/teal. **Don't** invent new colors per feature; **don't** use filled-solid badges except counts.

## KPI / stat card (new shared component — promote to `ui/stat-card.tsx`)
Replaces every left-border-accent stat card and the 5-card financial row (Clients + Locations share ONE component).
- Anatomy: mono uppercase kicker (10.5px, ls 1.4px, muted) + optional lucide icon right → display-font value (26–30px, ls −1px, tabular) → 12px sub line (may be a link). Optional delta chip beside value.
- Value color: neutral by default; gold/teal/coral only when the number IS the signal (e.g. Overdue). **Don't** color every card.
- The Financials equation row keeps its `− = −` operators between cards and gold-outlined card on `=` results (see mockup `us-financials.jsx → USFinStat`).

## Page header (new pattern — `components/layout/page-header.tsx`)
Mono gold kicker (section · context, e.g. "MONEY · JUNE 2026") → display title 30px → actions right-aligned (max one gold). Subtitle only when it adds info. Replaces title+gray-subtitle pattern on all 28 screens.

## Sidebar — `components/layout/app-sidebar.tsx`
New IA, 4 groups (replaces 6–7 collapsible groups; nothing removed, just regrouped):
- **Today:** Dashboard · Tasks · Daily Planner
- **Growth:** Prospects · Pipeline · Outreach · AI Discovery · Creative Hub · Blog · Pulse
- **Clients:** Clients · Locations · Feedback · Chat Analytics
- **Money:** Financials · Billing & AR · Invoices · Recurring
- **Studio** (Backhaus sub-brand, SUPER_ADMIN): Backhaus Studio · Studio Clients
- Operations group items (Operations/Workforce/Nightly Reviews/Team Chat/Team/Schedule/Assignments/Checklists) form a 5th group **Operations** between Today and Growth.
Groups always expanded (no accordions). Active item: gold text + 10% gold fill + 25% gold border. Mono uppercase group labels. Top: brand block + ⌘K command bar (wire to existing `cmdk` in `ui/command.tsx`). Bottom: mode toggle (label flips "Light mode"/"Dark mode") + user card. Keep `role-switcher.tsx` behavior.
Counts as mono badges (Tasks 3, Clients 18). Keep role-gating exactly as-is.

## Table — `ui/table.tsx`
- Header: mono uppercase 10.5px muted, NOT bold.
- Money/dates/counts: mono tabular, right-aligned money.
- Status: chips per mapping above. Empty cell: "—" muted (never "Not provided" text — if a name is missing, show contact name + neutral "Website Lead" chip).
- Row actions: `View` ghost text-button + kebab menu (`dropdown-menu`) holding Edit/Delete. **Delete never sits red in a row** — it lives in the kebab, and confirms via `alert-dialog` (`confirm-delete-button.tsx` already exists — restyle, keep flow).
- Row height 52px, hover bg secondary at 50%.

## Empty state (new `ui/empty-state.tsx`)
Icon in 40px soft-gold rounded square → 15px display-font title (warm, specific: "No shifts tonight — enjoy the quiet") → 13px muted line → optional outline action. **Don't** ship bare icon+gray text again.

## Money formatting
`Intl.NumberFormat`, no cents for whole dollars in dashboards/tables, cents in invoices/billing. Always `font-mono tabular-nums`. Negative/overdue: coral, not red.

## AR aging ramp (Billing) — the ONE approved red
teal-600 (current) → gold-500 (1–2mo) → coral-600 (2–3mo) → `--color-danger` (3+mo). Same hues both modes (use dark variants on dark). Days-past-due text uses the bucket color.

## Progress bars & usage meters
Track: secondary. Fill: gold. Over-limit (e.g. 14/10): coral fill + coral mono label. Workforce hours bar: green fill under 38h, gold 38–40, coral over 40.

## Modals — `ui/dialog.tsx`
18px radius, header = display title 20px + 13px muted sub, footer right-aligned `outline` + primary. Info boxes ("How it works"): teal-tinted panel w/ teal border, 13px — never blue. Dry-run/preview toggles: bordered checkbox card pattern (keep, restyle).

## Nav-cards (Operations hub) 
Icon tile (soft gold) + title + 13px sub + count (display font 24px) + ghost arrow link. Replaces the current 4 big cards. Don't add CTA buttons inside — whole card is the link.

## Charts — `ui/chart.tsx` / recharts
Series order: gold, teal, muted, coral, green (chart tokens already mapped in `01`). Bars 5px radius. Gridlines: border color. Bar-list rows (Revenue by Client / OpEx by Category): see mockup `USBarRow` — name + mono value + mono % right, 6px track below; % label muted (never red).

## Portal-specific (see `usp-live-*.jsx` for exact specs)
- Shell: light only (`cream-50` bg), top nav w/ client logo + underline-active links, NO sidebar.
- Photo panel: drag-drop hero w/ gradient scrim, brand chip top-left, status pill bottom.
- Stat tiles: sage/sky pastel tiles (KITCHEN STATUS / NEXT VISIT).
- Timeline: gold dots + mono times + 1px connector ("Last night").
- Action rows: 40px gold-tinted icon circle + display title + arrow.
- Buttons here ARE pills (999 radius) — the portal is the softer voice of the brand.

## Bilingual field-pair (Checklists, AI assistants)
EN field + ES field side-by-side 1fr/1fr, labels "Section Name (English)*" / "(Spanish)"; segmented EN/Español toggle in page header; "AI Translate All" = outline button w/ spark icon. Keep exactly this structure — it's a differentiator.

## Backhaus Studio (DECIDED: fold into gold — option B)
Hero tiles become gold/peach pastel action tiles like the portal's (`USPMActionTileSm` in `us-portal-merged.jsx`): pastel fill + deep-tone icon circle + display title + arrow. Orange/magenta gradients retired. Pills → chips. Recent Creations grid uses 14px-radius cards w/ neutral chips. The photography itself provides the color — the chrome stays quiet.

## FAB (DECIDED: keep, restyled gold)
Gold, 48px circle, bottom-right 24px inset; bg gold-400 (dark) / gold-600 (light); spark icon in primary-foreground; soft shadow on light, 1px gold-line border on dark. Show only on screens where the AI assistant has real context; hide on modals and the portal.
