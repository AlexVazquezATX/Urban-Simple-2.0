# Lead machine

Finds new hospitality accounts every night from public data and Google, files
them in the CRM with the reason they're worth contacting (Phase A), then
researches each one, finds who to write to and drafts a first email for
approval (Phase B), and reports each morning. Nothing is ever sent without a
person approving and sending it from the approval queue.

## What runs when

| Time (UTC) | Austin | Route | Does |
|---|---|---|---|
| 07:00 and 08:00 | 2 a.m. | `/api/cron/lead-machine` | Sourcing + health check for every company with the machine on |
| 08:00 and 09:00 | 3 a.m. | `/api/cron/lead-machine-prep` | Account research and first drafts, live (not dry-run) companies only |
| 12:30 and 13:30 | 7:30 a.m. | `/api/cron/lead-machine-brief` | Morning brief |

Vercel crons run in UTC, so each job is scheduled at both UTC hours its local
time can fall on (daylight and standard time) and only the run that lands on
the right local hour, in the company's branch timezone, does anything.

## Sources

| Source | Data | Cadence | Cost |
|---|---|---|---|
| `tabc` | TABC pending new on-premise license applications (`data.texas.gov/resource/mxm5-tdpj`), last 60 days. Types MB, BG, FB, BE. One business per primary license. | Nightly | Free |
| `alcohol_sales` | Texas Comptroller Mixed Beverage Gross Receipts (`data.texas.gov/resource/naix-2893`), latest *complete* month, locations selling $60k+/month. | Nightly (data changes monthly) | Free |
| `places_hotels` | Google Places text search for hotels and resorts, 150+ reviews, economy chains excluded. | Weekly (from the last attempt, failed ones included) | Paid per call; capped by `placesMonthlyCallCap` (default 600/month, shared with account research). Dry runs and calls made before a failure both count. Skipped if `GOOGLE_PLACES_API_KEY` is unset. |

Area: Austin, West Lake Hills, Rollingwood, Lakeway, Bee Cave, Sunset Valley
(`AREA_CITIES` in `src/lib/lead-machine/sources/types.ts`).

## How a candidate becomes a prospect

1. **Merge:** the same business from two sources becomes one candidate (same normalized name, or same street address plus a shared name word). Google's name wins over license and taxpayer names.
2. **Match the CRM:** a candidate matching any existing prospect, *including lost and soft-deleted ones*, only gets its signals attached. Current and past **clients** (and their location names and addresses) are skipped entirely. Same name at a different known address counts as a separate location of a chain.
   - Every account the machine adds also gets a permanent `machine_seen` signal. Signals outlive a hard-deleted prospect (`prospect_id` becomes null), so a business that was deleted or renamed in the CRM is recognized by its signals and never re-added.
3. **Cap:** new accounts are taken in priority order (hotels and resorts first, then by sales volume and filing recency) within each source's daily cap and the total `dailyNewCap` (default 25; counts everything the machine added that local day).
4. **Write:** new prospects land with `status: 'prospect'` (holding area, off the pipeline board), `source: 'lead_machine'`, tags `lead-machine`, segment and `src:*`, and a note listing why. Every fact is also a `prospect_signals` row (`tabc_new_license`, `alcohol_sales`, `google_places`), deduped by `source_key`.

**Dry run** (the default for a new company) does all of the above except the writes, and logs what it would have added.

## Account research and first drafts (Phase B)

Each night at 3 a.m., up to `prepDailyCap` (default 10) new machine accounts
still in the holding area are prepped, hotels and resorts first:

1. **Google** (one Places API (New) text search): website, phone, rating, a few recent reviews. Only trusted if it is plausibly the same business (shared name word or same street).
2. **Website**: homepage, `/about` and `/contact`, for published emails and the text of their story.
3. **Research** (Claude, `claude-opus-5-5`): the decision maker *if the material names one*, up to four true facts worth mentioning, and anything to avoid. It never guesses names.
4. **Contact** (`prep/contacts.ts`), cheapest first: an existing CRM contact; else the named decision maker via Findymail (1 credit if found); else Findymail's person with the right title (owner/GM for restaurants and bars, GM/operations/F&B/housekeeping for hotels; up to 2 credits); else the best inbox the website publishes, verified (1 credit). Findymail-found addresses are verified. An unconfirmed address is saved as `risky`, which the send gate holds.
5. **Draft** (Claude): the first email, written to the house rules in `prep/copy.ts` (only verified facts about Urban Simple, the free-deep-clean-with-3-month-agreement offer, no em dashes, links, placeholders, sign-offs, call asks or anything implying the place is dirty). `validateDraft` checks every rule in code; a draft that fails gets one rewrite, then is dropped (`no_draft`) rather than queued.
6. **Write**: new contacts, the draft as a step-1 `outreach_messages` row with no campaign and no schedule (`approvalStatus: 'pending'`), a `prospect_research` row, website/phone filled on the prospect if empty, and an activity note. The executor never picks up an unscheduled step-1 message, so the draft only goes out when someone approves and sends it in **Growth > Outreach**.

A `prospect_research` row means "handled": the account is not paid for again.
`no_contact` accounts are retried after about 60 days, failed ones after 2
days, three attempts at most. Chain hotels whose only website is the brand's
(marriott.com, hyatt.com) can't be searched; they are listed in the brief as
needing a GM name from LinkedIn.

**Costs**: Findymail is capped by `findymailMonthlyCap` (default 500 credits);
Google calls count against the shared Places cap; Claude is two calls per
account. A preview spends the same Google and Claude calls (Findymail only when asked) and writes nothing.

**Keys**: `ANTHROPIC_API_KEY` (required; without it prep is skipped and the
health check says so), `FINDYMAIL_API_KEY` (without it contacts come only from
websites and stay unverified), `GOOGLE_PLACES_API_KEY`. Findymail is also the
first verifier in the send gate (`outreach-recipient.ts`).

## Run log, health, switches

- Every stage writes a `lead_machine_runs` row: `tabc`, `alcohol_sales`, `places_hotels`, `sourcing`, `health`, `brief`. A failing source is logged and the others still run.
- **Health check** after each nightly run alerts on: any failed stage in the last 26h, no successful nightly run in 26h, three live (not dry) runs in a row that added nothing, and, once live: account research that didn't run or is paused (missing key), Findymail out of credits or under 50 finder credits, a missing `FINDYMAIL_API_KEY`, five or more machine drafts waiting over 3 days for approval, and any stage still marked running after 15 minutes (cut off by the platform; its spend so far is saved as it goes).
- **Notifications** go to Telegram when `LEAD_MACHINE_TELEGRAM_BOT_TOKEN` and `LEAD_MACHINE_TELEGRAM_CHAT_ID` are set (Mercury's bot works), otherwise by email to `notifyEmail`, `LEAD_MACHINE_NOTIFY_EMAIL`, or the company's first super admin.
- **Switches and caps** live on **Growth > Lead Machine** (`/growth/machine`) and `PATCH /api/growth/machine`. Off stops the nightly run and the brief.

## Manual runs

`POST /api/growth/machine/run` (SUPER_ADMIN/ADMIN, session or API key):

- `{ "stage": "sourcing" }`: dry run now (pass `"dryRun": false` to write; `"forcePlaces": true` to run Google even if it ran this week)
- `{ "stage": "prep" }`: research and draft the next waiting account(s) as a preview, nothing saved (`"limit": n`, up to 25; `"prospectIds": [...]` to prep specific prospects, any source; `"paid": true` to include Findymail lookups, which a preview skips by default; `"dryRun": false` to save for real)
- `{ "stage": "brief_preview" }`: returns the brief without sending it
- `{ "stage": "brief" }` / `{ "stage": "health" }`

`npx tsx scripts/lead-machine-preview.ts` shows what the sources find right now without touching the database (Google capped at 4 calls; `PLACES_BUDGET=n` to change).

## Rollout

1. Apply the schema **before** deploying: `npm run apply-sql -- scripts/apply-lead-machine.sql`, then `scripts/apply-lead-machine-b.sql` for Phase B
2. Deploy. The machine stays off until switched on.
3. On Growth > Lead Machine: switch it on (it starts in dry run), press **Dry run now**, read the run log.
4. After a few nights of sensible dry runs, switch dry run off.

## Implementation map

| Concern | File |
|---|---|
| Settings and validation | `src/lib/lead-machine/settings.ts` |
| Run log, Places usage | `src/lib/lead-machine/runs.ts` |
| Name/address matching | `src/lib/lead-machine/match.ts` |
| Sources | `src/lib/lead-machine/sources/*.ts` |
| Merge, caps, writes | `src/lib/lead-machine/pipeline.ts` |
| Health check | `src/lib/lead-machine/health.ts` |
| Morning brief | `src/lib/lead-machine/brief.ts` |
| Telegram/email | `src/lib/lead-machine/notify.ts` |
| Account prep (research, contacts, drafts) | `src/lib/lead-machine/prep/run.ts` |
| Google lookup, website reader | `prep/places-lookup.ts`, `prep/site.ts` |
| Findymail client | `prep/findymail.ts` |
| Who to write to | `prep/contacts.ts` |
| Claude calls, writing rules | `prep/claude.ts`, `prep/copy.ts` |
| Tests | `npm run test:machine` |
