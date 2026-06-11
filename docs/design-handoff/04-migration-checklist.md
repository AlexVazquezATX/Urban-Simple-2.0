# 04 · Migration Checklist — per route

Per-screen pass = apply archetype, then verify: ☐ tokens only (no raw hex) ☐ fonts correct (display/body/mono in right places) ☐ chips per mapping ☐ one gold button max ☐ no inline red Delete ☐ empty states designed ☐ both modes checked ☐ money mono+tabular.

## Phase 4a — Dashboards
| Route | Files | Notes |
|---|---|---|
| `/dashboard` | `(app)/dashboard/page.tsx`, `components/dashboard/*` | Rebuild to mockup 1:1 (`us-dashboard.jsx`). Old widgets all covered (confirmed). Briefing: collapse AI text to 1-line digest + Read button. Needs-attention rail: curated, capped, chips not raw invoice dumps. |
| `/financials` | `(app)/financials/page.tsx`, `components/financials/*`, `components/money/*` | Equation row already exists conceptually — restyle to `USFinStat` (gold-outline `=` cards, mono numerals). Bar lists → `USBarRow`. Remove red % labels. |
| `/growth` (Daily Planner) | `(app)/growth/page.tsx`, `components/growth/*` | DASH archetype. urgent→coral chips. Empty schedule → designed empty state. |
| `/chat-analytics` | `(app)/chat-analytics/page.tsx` | DASH. Time-range = segmented control. Zero-data cards need empty treatment. |
| `/dashboard/blog` | `(app)/dashboard/blog/*` | DASH+LIST. Stat cards → StatCard. Post pills → chips. |
| `/creative-hub` | `(app)/creative-hub/*` | HUB. Teal Generate tile → gold primary tile. Counters → KPI chips. |
| `/pulse` | `(app)/pulse/*` | Keep magazine article styling (pulse-article-content) but swap bronze accents → gold tokens. |

## Phase 4b — Lists
| Route | Files | Notes |
|---|---|---|
| `/growth/prospects` (Leads) | `(app)/growth/prospects/*`, `components/growth/*` | Biggest table. Column discipline (≤9 visible). HOT→gold chip, new→neutral. "Not provided"→ contact + Website Lead chip. Filter row: collapse 7 controls → search + 3 selects + More filters popover. |
| `/clients` | `(app)/clients/page.tsx`, `components/clients/*` | Shared FinancialKPIRow w/ Locations. Delete → kebab. Teal View Details → ghost gold. |
| `/locations` | `(app)/locations/*`, `components/locations/*` | Same as Clients. "Never reviewed" → coral chip (not red bar). Grid-view cards per mockup card spec. |
| `/team` | `(app)/team/*`, `components/team/*` | Role pills → chip tones. |
| `/operations/workforce` | `(app)/operations/workforce/*`, `components/workforce/*` | Hours bar per `02` progress spec. |
| `/financials/expenses` | `(app)/financials/expenses/page.tsx` | Category pills → neutral chips. Edit/Delete → kebab. |
| `/invoices` | `(app)/invoices/*`, `components/invoices/*` | Overdue chips coral. Generate modal per modal spec. |
| `/billing` + `/billing/agreements` | `(app)/billing/*`, `components/billing/*` | Aging ramp per `02` (the approved red). Total Outstanding hero card → StatCard XL. |
| `/admin/studio-clients` | `(app)/admin/studio-clients/*` | Usage meter per `02`. Plan pills → chips. |
| `/admin/feedback` | `(app)/admin/feedback/page.tsx` | Star rating component (gold stars). |

## Phase 4c — Specials
| Route | Files | Notes |
|---|---|---|
| `/growth/pipeline` | `(app)/growth/pipeline/*`, `components/pipeline/*` | BOARD kanban spec. high→coral chip. |
| `/operations/schedule` | `(app)/operations/schedule/*` | BOARD calendar spec. Red exception zeros → muted until >0, then coral. |
| `/operations` | `(app)/operations/page.tsx`, `components/operations/*` | HUB. Stale queue: red card-border → coral chip rows + ONE alert banner. |
| `/operations/nightly-reviews` | `(app)/operations/nightly-reviews/*` | **P0 contrast bug**: progress banner. Rebuild as KPI strip. FEED archetype. |
| `/operations/checklists` | `(app)/operations/checklists/*` | CAPTURE archetype, bilingual field-pair spec. |
| `/growth/outreach` | `(app)/growth/outreach/*` | FEED. Approval cards per mockup; Approve All gold. |
| `/chat` (Team Chat) | `(app)/chat/*`, `components/team-hub/*` | DETAIL rail+pane. AI assistant cards → gold concierge treatment. |
| `/creative-studio` | `(app)/creative-studio/*`, `components/creative-studio/*`, `components/studio/*` | DECIDED: fold into gold — option B in `02` (gold/peach pastel tiles, gradients retired). |
| `/command` | `(app)/command/page.tsx`, `components/command/*` | Wire ⌘K from sidebar; restyle palette to tokens. |

## Phase 5 — Portal (match `Urban Simple Portal — Live.html` exactly)
| Route | Files | Maps to prototype |
|---|---|---|
| `/portal/login` (+signup) | `(portal)/portal/login/page.tsx` | LiveLogin — split photo + "Welcome back." |
| `/portal` | `(portal)/portal/page.tsx`, `components/portal/*` | LiveHome (D · Quiet merge): photo panel, greeting, sage/sky tiles, timeline, action rows, photo strip, manager footer. |
| `/portal/walkthroughs` + `/new` + `[id]` | `(portal)/portal/walkthrough*` | LiveWalkthrough — zone list + capture panel + progress. |
| `/portal/cleaning-log` | `(portal)/portal/cleaning-log/page.tsx` | LiveLog — visit cards w/ crew, zone chips, note, photos. |
| `/portal/issues` + `[id]` + `/new` | `(portal)/portal/issues/*` | LiveIssues — status chips (open/scheduled/resolved) + Marco-reply thread. |
| `/portal/documents`, `/portal/team` | `(portal)/portal/{documents,team}/page.tsx` | Inner-page shell (centered column + PageHeader); follow LiveLog card language. |
| `/portal/inspection-packet` | `(portal)/portal/inspection-packet/page.tsx` | Keep print styles; restyle screen view to portal shell. |
| Portal layout | `(portal)/portal/layout.tsx` | Top-nav shell per LiveNav; light mode only. |

## Phase 6 — sweep
Run checklist header items on all routes, both modes; grep for retired classes (`btn-lime`, `card-ramp`, `heading-ramp`) and raw hex (`#EAC435`, `#A67C52`, `#14B8B8`, `#C45A4A`); verify focus rings visible on gold; keyboard-test ⌘K, tables, kanban.
