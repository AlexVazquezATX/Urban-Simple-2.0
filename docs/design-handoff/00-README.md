# Urban Simple 2.0 — Design Handoff Package

**Goal:** apply the approved redesign (see mockups below) across the entire platform — admin, both modes, and the client portal — with zero drift.

## Visual reference (open these first)
- `Urban Simple Redesign.html` — canvas: chosen portal direction (D), admin dark + light screens
- `Urban Simple Portal — Live.html` — clickable portal prototype (Login, Home, Walkthrough, Cleaning Log, Issues)
- Mockup source components: `us-shared.jsx` (tokens + chrome), `us-dashboard.jsx`, `us-financials.jsx`, `us-tasks.jsx`, `us-portal-merged.jsx` (USPortalMergeQuiet = chosen portal home), `usp-live-*.jsx`

## Package contents
| File | What it is |
|---|---|
| `01-design-tokens.md` | Exact `globals.css` `@theme` replacement — fonts, scales, semantic mappings, both modes |
| `02-component-rules.md` | Component specs + do/don't rules, anchored to `src/components/ui/*` |
| `03-screen-archetypes.md` | The 7 page templates every screen maps onto |
| `04-migration-checklist.md` | Per-route checklist with file paths, archetype, and notes |
| `screen-inventory.md` | Raw audit of all 28 current screens (from production screenshots) |

## Order of operations (do it in this order — each phase compounds)
1. **Phase 0 — Tokens & fonts** (`01`): swap the `@theme` block + font import in `src/app/globals.css`. This alone moves ~60% of the platform.
2. **Phase 1 — UI primitives** (`02`): Button, Badge, Card, Table, Tabs, Input in `src/components/ui/`. Add the new Badge tones; replace the `lime` button variant with `gold`.
3. **Phase 2 — Chrome**: `src/components/layout/app-sidebar.tsx` (new 4-group IA + ⌘K) and the page-header pattern.
4. **Phase 3 — Shared patterns**: KPI card/row, empty state, money formatting, chips-not-pills. These are the patterns repeated on every screen.
5. **Phase 4 — Admin screens** by archetype (`03` + `04`): dashboards first, then lists, then the specials (Pipeline board, Schedule calendar, Checklist builder).
6. **Phase 5 — Portal**: rebuild `src/app/(portal)` to match the live prototype. Routes already exist 1:1.
7. **Phase 6 — QA sweep**: run the checklist in `04` per screen; check both modes for every screen.

## Stack facts (verified from repo)
- Next.js 16 App Router, React 19, Tailwind **v4** (`@theme` in `globals.css`, no tailwind.config), shadcn/ui + Radix, CVA variants, lucide-react icons, recharts, next-themes (`.dark` class), framer-motion.
- Route groups: `(app)` admin · `(portal)` client portal · `(studio)` Backhaus · `(public)` marketing.
- Theme = one `@theme` block + one `.dark` override block. The whole reskin hinges on those two blocks.

## Decisions already made (do not relitigate)
- Gold is the one primary accent; teal is informational only. The lime/Ramp accent is retired.
- Fonts: Bricolage Grotesque (display) / Instrument Sans (body) / Spline Sans Mono (numbers & labels). Fraunces, Inter, JetBrains Mono, Cormorant retired.
- Red is reserved for destructive confirmation + the AR aging ramp's last stop. Everything else that is red today becomes a coral or gold chip.
- Portal home = "D · Quiet merge" exactly as prototyped.
- Dashboard = redesigned mockup 1:1 (user-confirmed every old widget is covered).
- **Backhaus Studio folds into the gold system** — use option B in `02-component-rules.md` (gold/peach pastel tiles); the orange/magenta gradients are retired.
- **The floating sparkle FAB stays, restyled gold** — 48px, gold-400 (dark) / gold-600 (light), spark icon in primary-foreground; show only on screens where the AI assistant has context.
