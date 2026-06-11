# 03 · Screen Archetypes

Every screen maps onto one of seven templates. Build each archetype once as a composition of Phase 1–3 parts; screens then only differ by data.

## 1 · DASH (dashboard)
PageHeader (greeting or section title) → optional briefing banner (gold-tinted gradient card w/ spark icon + 1-line digest + "Read" button) → KPI row (3–5 stat cards) → main grid `1fr 380px`: primary work cards left, attention/quick-action rail right.
Reference: `us-dashboard.jsx`. Screens: Dashboard, Daily Planner, Chat Analytics, Blog, Creative Hub, Creative Studio, Financials (variant: equation row instead of KPI row, then 3-col analysis grid — `us-financials.jsx`).

## 2 · LIST (index/table)
PageHeader + actions → optional KPI row → filter bar (search input + select filters + count tabs as underline tabs, NOT buttons) → Table per `02` rules (or card grid where a view-toggle exists — keep `ui/view-toggle.tsx`).
Screens: Leads/Prospects, Clients, Locations, Team, Workforce, Recurring Expenses, Invoices, Studio Clients, Feedback, Assignments.
Rules: 13-col tables get column discipline — group lesser columns behind the kebab/detail view; max ~9 visible. Checkbox column only when bulk actions exist.

## 3 · DETAIL (record)
Back arrow + record title in PageHeader → header card (identity + key stats) → section cards. Screens: client detail, location detail, studio-client detail, chat (rail + pane).

## 4 · FEED (review queue)
PageHeader → status sub-tabs w/ counts → queue of rich cards (preview content + per-card approve/dismiss + bulk gold action).
Screens: Outreach approval queue, Nightly Reviews, Operations stale-review queue, Issues (portal).

## 5 · BOARD
- Kanban (Pipeline): column = mono uppercase label + count chip; cards 12px radius w/ chips; empty column = dashed outline + muted line; WON column stays visible. Drag via existing `@hello-pangea/dnd`.
- Calendar (Schedule): day columns, Today = gold border + gold chip; empty day = muted "No shifts" + ghost +Add; shift cards = time (mono gold) + client + crew avatars.

## 6 · CAPTURE/FORM
Multi-step or sectioned input: Checklist builder, Add Location modal, walkthrough flow. Section cards w/ drag handles, field pairs per `02` bilingual spec, sticky Save (gold) top-right, live preview pane where present. Inputs: 12px radius, bg-background, border-input; labels mono uppercase 9.5px.

## 7 · HUB
Landing page of a section: nav-cards grid (per `02`) + one live queue/list below. Screens: Operations, Creative Hub home, Creative Studio home.

## Portal shell (separate layout, `(portal)` group)
Light only. Top nav (no sidebar). Home + Login use the split photo layout (`usp-live-home.jsx`); inner pages (Walkthrough/Log/Issues/Documents/Team) use centered 920px column w/ PageHeader (`usp-live-pages.jsx`). Match the live prototype exactly — it is the spec.
