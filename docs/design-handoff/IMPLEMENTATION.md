# Implementation Brief — Urban Simple Redesign (gold / ink / cream)

Phases 0–3 are DONE. This file tells screen-migration agents exactly what
already exists so screens compose the system instead of re-inventing it.
Read `02-component-rules.md` + `03-screen-archetypes.md` + your row in
`04-migration-checklist.md` before touching a screen. Mockup sources live
in `mockups/` (inline-styled JSX — match their look using Tailwind +
the primitives below, do NOT copy inline styles).

## Tokens (Phase 0 — done, in `src/app/globals.css`)
- Semantic tokens are remapped: `bg-background`, `bg-card`, `text-foreground`,
  `text-muted-foreground`, `bg-secondary`, `border-border`, `bg-primary`
  (= gold-600 light / gold-400 dark), `ring`, `destructive` (true red —
  confirm dialogs + AR 90+ bucket ONLY).
- New scales: `gold-50..900`, `ink-100..950`, `cream-50..700`, `teal-300/600`,
  `coral-300/600`, `green-300/600`, pastels `sage-bg/line/deep`,
  `sky-bg/line/deep`, `peach-bg/line/deep`, `danger`.
- Accent dim/line recipe: fills at 10–12% alpha, borders 25–30% —
  e.g. `bg-gold-600/10 border-gold-600/30 dark:bg-gold-400/12 dark:border-gold-400/25`.
- LEGACY scales (`charcoal/warm/ocean/bronze/lime/plum/honey/terracotta`,
  numeric `sage`) are deprecated aliases that currently remap to the new
  palette. **Replace any you touch** with new-scale or semantic tokens.
- Both modes come free if you use semantic tokens + the dark: pairs above.
  Never hardcode hex.

## Fonts
- `font-display` = Bricolage Grotesque → headings & big numerals only.
- `font-sans` = Instrument Sans → body.
- `font-mono` = Spline Sans Mono → ALL money/figures (`tabular-nums`),
  kicker labels, table meta.
- `.kicker` utility = mono 10.5px uppercase tracking 1.4px (add a color,
  usually `text-muted-foreground` or `text-primary`).
- Page `h1` is capped at 30px inside `[data-shell]` (already applied).

## Primitives (Phase 1 — done)
- `Button` (`ui/button.tsx`): variants `default`/`gold` (same — THE gold CTA),
  `outline` (secondary actions), `ghost` (tertiary), `destructive` (ONLY
  inside confirm dialogs — never inline in tables/cards), `link`.
  **One gold button per view region, max.** `variant="lime"` is a deprecated
  alias — rename to `gold` when you touch a call site. Radius 9px, h-9.
  Icon buttons in table rows: `size="icon-sm"` with 16px lucide icon.
- `Badge` (`ui/badge.tsx`): tones `neutral` (default), `gold`, `teal`,
  `coral`, `green`. Mapping: urgent→coral · HOT→gold · draft→neutral ·
  Published→teal · active→green · AI→gold w/ spark icon · roles: Super
  Admin/Admin→gold, Manager→teal, Associate→neutral · plans: TRIAL→neutral,
  PROFESSIONAL→gold, Comp→teal. Don't invent new colors; filled `default`
  variant is for counts only.
- `Card`: 14px radius, soft shadow light / border-only dark. `CardTitle`
  is display-font 17px already.
- `Table`: header = mono uppercase muted (automatic). Money/dates/counts:
  `font-mono tabular-nums`, money right-aligned. Empty cell: `—` muted
  (never "Not provided"; missing name → contact name + neutral
  "Website Lead" chip). Row actions: `View` ghost text-button + kebab
  (`dropdown-menu`) holding Edit/Delete; Delete confirms via
  `confirm-delete-button.tsx` / `alert-dialog`. **Delete never sits red in
  a row.** Max ~9 visible columns.
- `Tabs`: now underline-style (count tabs pattern) — use for status
  sub-tabs w/ counts.
- `Input`/`Textarea`/`Select`: 12px radius, bg-background. `Label`: mono
  uppercase 9.5px automatically.
- `Dialog`: 18px radius, display title. Info boxes ("How it works"):
  teal-tinted panel `bg-teal-600/10 border-teal-600/30` + 13px text —
  never blue.

## Shared patterns (Phases 2–3 — done)
- `PageHeader` (`components/layout/page-header.tsx`):
  `<PageHeader kicker="MONEY · JUNE 2026" title="Financials" subtitle? actions? backHref? />`
  Kicker = SECTION · CONTEXT, uppercase. Max one gold action.
- `StatCard` / `StatCardEq` (`ui/stat-card.tsx`):
  `<StatCard label value sub icon tone delta={{text,tone}} />`
  Value neutral by default; gold/teal/coral only when the number IS the
  signal. `StatCardEq` adds `op` ("−"/"=") and `highlight` (gold outline)
  for the Financials equation row.
- `EmptyState` (`ui/empty-state.tsx`):
  `<EmptyState icon title description action? />` — warm, specific titles.
- Money: `formatMoney` (no cents — dashboards/tables) / `formatMoneyExact`
  (cents — invoices/billing) / `moneyClass` from `src/lib/format.ts`.
  Negative/overdue = coral, not red.
- Sidebar/⌘K/FAB are done — don't touch `app-sidebar.tsx`,
  `command-palette.tsx`, `layout-wrapper.tsx`.

## Hard rules (checklist per screen)
☐ tokens only (no raw hex, no legacy scales in code you touch)
☐ display/body/mono in the right places
☐ chips per mapping — no pill zoo
☐ one gold button max per region
☐ no inline red Delete (kebab + confirm dialog)
☐ designed empty states (EmptyState component)
☐ both modes work (semantic tokens / dark: pairs)
☐ money mono + tabular, right-aligned in tables
☐ red reserved for destructive confirm + AR 90+ bucket
☐ progress bars: track secondary, fill gold; over-limit coral
   (workforce hours: green <38h, gold 38–40, coral >40)
☐ charts: series order gold, teal, muted, coral, green; 5px bar radius;
   gridlines = border color

## Verification
After your edits run `npx tsc --noEmit` and fix anything you broke.
Do not run the dev server. Do not commit.
