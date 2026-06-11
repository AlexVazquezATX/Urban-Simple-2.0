# Urban Simple 2.0 — Screen Inventory (for redesign handoff)

Working notes. Archetypes: DASH (dashboard), LIST (index/table), DETAIL (record), CAPTURE (flow), FORM (settings), BOARD (kanban), FEED (queue/review).

## Batch 1 (June 10)

| Screen | Mode seen | Archetype | Notes / design needs |
|---|---|---|---|
| Creative Hub | dark | DASH | 6 action tiles (Generate/Images/Brand Assets/Create/Gallery/Inspiration) + "Recent Creations" list w/ thumbnails + draft badges. Teal CTA tile clashes w/ new gold system → use gold primary tile rule. Counter pair "11 created / 1 ready" top-right → convert to KPI chips. |
| Blog Management | light | DASH+LIST | 4 stat cards (left-border accent style — REPLACE with new stat card), post list w/ thumbnail, category/Published/AI pills, views meta. "Generate New Post" gold btn. |
| Chat Analytics | light | DASH | 4 stat cards, time-range segmented control (24h/7d/30d), tabs (Overview/Ask Insight/Digest), Top Active Channels ranked list, AI Assistant Usage list. Mostly zero-data → needs designed empty states. |
| Daily Planner | light | DASH | 4 stat cards, Priority Outreach list (urgent pills) + Today's Schedule w/ empty state. Red "urgent" pill → coral chip. |
| Leads (Prospects) | dark | LIST | Heaviest table: KPI row, search + 6 filter dropdowns + toggle, count tabs (All/Contact Today/Hot/...), 13-col table w/ checkboxes, HOT pills, row actions. Needs the table spec: mono tabular nums, pill rules, column discipline, "Not provided" empty-cell treatment. |
| Outreach Hub | dark | FEED | Top tabs (Messages/Compose/Sequences/Templates/Analytics/Settings), status sub-tabs w/ counts, Approval Queue: email preview cards w/ AI + email pills, approve/reject icons, Approve All gold btn. |
| Pipeline | dark | BOARD | Kanban: NEW(221)/RESEARCHING/CONTACTED/ENGAGED/QUALIFIED/PROPOSAL/WON columns, prospect cards w/ "high" pills, per-column counts, empty columns, horizontal scroll. Needs board spec (column header, card, empty col, WIP counts). |

## Cross-cutting observations (current site)
- Global chrome: white/dark sidebar w/ 6 collapsible groups (Admin Tools, Growth, Operations, Client Relations, Administrative), top bar w/ Dev Mode pill + Super Admin account chip. New system replaces with 4-group sidebar + ⌘K.
- Stat card pattern everywhere: left-border accent color + label/big number/sub — replace with new KPI card (mono kicker label, display number, chip delta).
- Pill zoo: many colors/shapes (urgent red, HOT gold, draft, Published teal outline, AI purple, channel type gray). Needs single chip spec w/ 5 tones.
- Floating teal sparkle FAB bottom-right on every page — decide: keep as AI assistant entry, restyle gold, or fold into ⌘K.
- Mixed teal/gold accent usage page-by-page → unify per new token rules (gold = primary, teal = informational).
- Page header: title + gray subtitle + right-aligned actions — maps directly to new PageHead (kicker/title/actions).

## Batch 2 (June 10)

| Screen | Mode seen | Archetype | Notes / design needs |
|---|---|---|---|
| Operations (hub) | dark | DASH | 4 big nav cards (Checklists/Assignments/Schedule/Review Flags) w/ count + CTA btn, then "Stale Review Queue" (red-bordered card, red "Never reviewed" labels, 40 flagged). Red overload → coral chips + single alert banner per new system. Nav-card pattern needs a spec (icon tile + count + arrow link). |
| Workforce | dark | LIST | KPI row (Active Associates/Over 40h/Near 40h/Monthly Payroll), expandable associate rows: avatar, accounts count, hours progress bar, "0h/40h" green pill, $/month, kebab. Needs progress-bar + expandable-row spec. |
| Nightly Reviews (Tonight's Route) | dark | FEED | Progress banner (broken gradient: light gray-teal block w/ illegible white text — worst contrast bug in app), All/Pending/Completed count tabs, empty state w/ icon. Redesign banner as proper KPI strip. |
| Team Chat + AI channel modal | dark | DETAIL/modal | Slack-like: Channels rail + DM list + main pane. "Create AI Assistant Channel" modal: assistant cards (Maya HR, Lyra Payroll, Ace Ops) w/ emoji, role-access pills, Create Channel teal btn, EN/ES copy. Assistants are a brand moment — style as gold concierge cards. |
| Team Members | dark | LIST | KPI row (Total/Admins/Managers/Associates), table: avatar, email, phone, role pills (Super Admin/Admin/Manager/Associate — 4 colors), branch, View action. Role-pill tones → chip spec. |
| Schedule | dark | BOARD (calendar) | KPI row (Dispatch Ready/Needs Setup/Manager Routes/Exceptions w/ red zeros), week strip Sun–Sat, Today highlighted (teal outline), "No shifts +Add" per day, Prev/Next week, Generate Dispatch + Schedule Manager gold btns. Needs calendar spec (day column, today state, empty day, shift card). |
| Location Assignments | dark | LIST (empty) | Pure empty state: "No assignments yet" + Create First Assignment ghost btn. Empty-state spec applies. |
| Checklists builder | dark | CAPTURE/FORM | Back-arrow + record title, Build Checklist w/ EN/ES segmented toggle, AI Translate All, Save gold btn; Section cards w/ drag handle, EN+ES field pairs, item rows (frequency/priority dropdowns, Photo checkbox, red trash), Add Custom Item, live Preview pane. Most complex form — needs form-section spec; bilingual field-pair pattern is unique to US 2.0, keep it. |
| Clients (table view) | dark | LIST | KPI row (Locations Serviced/MRR/ARR/Monthly Profit/Blended Margin — gold numerals), search + status filter, table: logo tile, AUS branch pill, billing email, locations, MRR/PROFIT/MARGIN in mono (gold/teal), active pill, NET_30, View + red Delete. Red Delete in every row → demote to kebab/hover per new rules. |
| Clients (card grid view) | dark | LIST alt | Same data as cards: logo, contact, pills row, MRR/PROFIT/MARGIN mini-table, teal "View Details" outline btn + red Delete. List/grid toggle top-right — keep pattern, restyle. |
| Locations (table + grid) | dark | LIST | Same KPI row as Clients. Table: location, client, branch, address, checklist, dispatch (Manual pill + service days), review status (red "Never reviewed" + "Needs manager review photos"), issues count. Grid: cards grouped by client w/ REVIEW bar, MRR/profit/margin, View Details teal btn. |
| Add New Location modal | dark | FORM/modal | Client select, logo upload dropzone (dashed), Upload Image btn, Location Name/Address/City/State/ZIP, Access Instructions (gate codes), Service Notes. Standard modal-form spec: 2-col where sensible, gold primary footer. |

## Cross-cutting (updated after batch 2)
- KPI-row pattern confirmed app-wide (5-card financial row repeats identically on Clients/Locations — should be one shared component).
- Red epidemic: "Never reviewed", Delete, exception zeros, urgent — demote most to coral chips; reserve red-tone only for destructive confirm.
- Teal vs gold split confirmed worse in dark mode (teal View Details btns + teal FAB vs gold CTAs on same screen).
- Mono digits already used in tables (matches new system's tabular-num rule — easy win).
- Empty states everywhere (new biz data) — empty-state component is high priority, current ones are bare icon+text.
- Contrast bug: Nightly Reviews progress banner (light gradient + white text) — flag as P0 fix.
- Backhaus Admin = 7th sidebar group (Backhaus Studio) — fold into new IA (likely under Growth or its own "Studio").
- Bilingual EN/ES is a real platform feature (checklists, AI assistants) — design system must spec the field-pair + language toggle.

## Batch 3 (June 10) — final batch

| Screen | Mode seen | Archetype | Notes / design needs |
|---|---|---|---|
| Financials (current) | dark | DASH | Already uses the money-equation framing (Revenue − Client Costs − OpEx = Operating Profit − Draws = Net Cash Flow) as 6 cards w/ gold outlines on the "=" cards — maps 1:1 onto the new equation row. Trend chart nearly empty (1 month captured). Revenue by Client + OpEx by Category = progress-bar lists (teal/pink bars, red % labels) → new USBarRow. "Super admin" lock pill next to title — keep concept, restyle. |
| Recurring Expenses | dark | LIST | 3 KPI cards (OpEx/Owner Draws/Total Monthly Outflow), table: name, category pill, vendor, monthly $ (mono), bill day, Active pill, Edit + red Delete every row. Category pill needs tone mapping; Delete → kebab. |
| Billing & AR (Outstanding Payments) | dark | DASH+LIST | Aging buckets as 4 cards (On Time teal / 1-2mo gold / 2-3mo orange / 3+mo red — $237K red!), Total Outstanding hero card ($477,586.46 / 79 invoices), AR Aging Report w/ bucket segmented control, table: invoice#, client, due date, days past due (red, e.g. "1256 days"), balance, 90+ pill, View/Remind actions. Aging color ramp is GOOD signal-red usage — keep ramp, refine tones. |
| Invoices + Generate modal | dark | LIST+modal | KPI (Total 79 / Outstanding / Overdue $477K red), invoice table w/ Overdue pills, Send Invoice + View per row. "Generate Recurring Invoices" modal: billing day + target date inputs, Preview Mode (dry run) checkbox card, blue "How it works" info box, Cancel/Preview btns. Modal pattern + info-box spec. |
| Backhaus Creative Studio | dark | DASH | Brand moment: orange "Food Photography" + magenta "Branded Posts" gradient hero tiles (off-system — decide: keep playful identity or re-skin gold), 4 quick tiles (Gallery/Brand Kit/This Month/Food Photos), Recent Creations photo grid w/ Food pills. Photo-grid card spec. |
| Studio Clients | dark | LIST | KPI (Total 5/Generations/New Signups/MRR), search + status/plan filters, table: client, TRIAL/PROFESSIONAL plan pills + purple Comp pill, usage meter (color-coded: white/gold/red 14/10 over-limit), active pill, last active, chevron. Usage-meter spec needed. |
| Customer Feedback | dark | LIST | 2 KPI (Total Feedback / Avg Rating w/ gold stars), category filter, feedback cards: stars, General pill, quote, name/email/company. Star-rating component spec. |
| Dashboard (current, late add) | dark | DASH | "Good evening, Alex" greeting + subtitle, collapsible Today's Briefing (AI text), 4 KPI (Total Clients/AR Outstanding/This Month/Overdue red 79), Tonight's Operations (empty state), Today's Focus w/ Generate Focus, Needs Attention rail (10 items — overdue invoices w/ high pills + View btns). Confirms redesigned dashboard covers every widget 1:1. User confirmed preference for new version incl. net-cash-flow module. |

Batch 3 confirms: no new archetypes. Financials current state already matches the new mockup's information architecture (equation cards) — migration is purely visual for that screen.

## NOT yet captured (user says batches done — confirm or skip)
- Client portal (client-facing login + screens) — critical for portal rebuild; ask if one exists in production
- Tasks / Daily Planner detail, AI Discovery, API Keys, Pulse
- Outreach sub-tabs (Compose/Sequences/Templates/Analytics/Settings)
- Mobile/responsive views, if any

## GitHub
Repo: https://github.com/AlexVazquezATX/Urban-Simple-2.0.git — connection pending (user must click Connect GitHub in Import menu).
