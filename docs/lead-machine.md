# Lead machine (Phase A)

Finds new hospitality accounts every night from public data and Google, files
them in the CRM with the reason they're worth contacting, and reports each
morning. Phase A sources and reports; research, drafting and sending come in
later phases (see the Lead Engine Launch checklist).

## What runs when

| Time (UTC) | Austin | Route | Does |
|---|---|---|---|
| 07:00 and 08:00 | 2 a.m. | `/api/cron/lead-machine` | Sourcing + health check for every company with the machine on |
| 12:30 and 13:30 | 7:30 a.m. | `/api/cron/lead-machine-brief` | Morning brief |

Vercel crons run in UTC, so each job is scheduled at both UTC hours its local
time can fall on (daylight and standard time) and only the run that lands on
the right local hour, in the company's branch timezone, does anything.

## Sources

| Source | Data | Cadence | Cost |
|---|---|---|---|
| `tabc` | TABC pending new on-premise license applications (`data.texas.gov/resource/mxm5-tdpj`), last 60 days. Types MB, BG, FB, BE. One business per primary license. | Nightly | Free |
| `alcohol_sales` | Texas Comptroller Mixed Beverage Gross Receipts (`data.texas.gov/resource/naix-2893`), latest *complete* month, locations selling $60k+/month. | Nightly (data changes monthly) | Free |
| `places_hotels` | Google Places text search for hotels and resorts, 150+ reviews, economy chains excluded. | Weekly (from the last attempt, failed ones included) | Paid per call; capped by `placesMonthlyCallCap` (default 300/month). Dry runs and calls made before a failure both count. Skipped if `GOOGLE_PLACES_API_KEY` is unset. |

Area: Austin, West Lake Hills, Rollingwood, Lakeway, Bee Cave, Sunset Valley
(`AREA_CITIES` in `src/lib/lead-machine/sources/types.ts`).

## How a candidate becomes a prospect

1. **Merge:** the same business from two sources becomes one candidate (same normalized name, or same street address plus a shared name word). Google's name wins over license and taxpayer names.
2. **Match the CRM:** a candidate matching any existing prospect, *including lost and soft-deleted ones*, only gets its signals attached. Current and past **clients** (and their location names and addresses) are skipped entirely. Same name at a different known address counts as a separate location of a chain.
   - Every account the machine adds also gets a permanent `machine_seen` signal. Signals outlive a hard-deleted prospect (`prospect_id` becomes null), so a business that was deleted or renamed in the CRM is recognized by its signals and never re-added.
3. **Cap:** new accounts are taken in priority order (hotels and resorts first, then by sales volume and filing recency) within each source's daily cap and the total `dailyNewCap` (default 25; counts everything the machine added that local day).
4. **Write:** new prospects land with `status: 'prospect'` (holding area, off the pipeline board), `source: 'lead_machine'`, tags `lead-machine`, segment and `src:*`, and a note listing why. Every fact is also a `prospect_signals` row (`tabc_new_license`, `alcohol_sales`, `google_places`), deduped by `source_key`.

**Dry run** (the default for a new company) does all of the above except the writes, and logs what it would have added.

## Run log, health, switches

- Every stage writes a `lead_machine_runs` row: `tabc`, `alcohol_sales`, `places_hotels`, `sourcing`, `health`, `brief`. A failing source is logged and the others still run.
- **Health check** after each nightly run alerts on: any failed stage in the last 26h, no successful nightly run in 26h, or three live (not dry) runs in a row that added nothing.
- **Notifications** go to Telegram when `LEAD_MACHINE_TELEGRAM_BOT_TOKEN` and `LEAD_MACHINE_TELEGRAM_CHAT_ID` are set (Mercury's bot works), otherwise by email to `notifyEmail`, `LEAD_MACHINE_NOTIFY_EMAIL`, or the company's first super admin.
- **Switches and caps** live on **Growth > Lead Machine** (`/growth/machine`) and `PATCH /api/growth/machine`. Off stops the nightly run and the brief.

## Manual runs

`POST /api/growth/machine/run` (SUPER_ADMIN/ADMIN, session or API key):

- `{ "stage": "sourcing" }`: dry run now (pass `"dryRun": false` to write; `"forcePlaces": true` to run Google even if it ran this week)
- `{ "stage": "brief_preview" }`: returns the brief without sending it
- `{ "stage": "brief" }` / `{ "stage": "health" }`

`npx tsx scripts/lead-machine-preview.ts` shows what the sources find right now without touching the database (Google capped at 4 calls; `PLACES_BUDGET=n` to change).

## Rollout

1. Apply the schema **before** deploying: `npm run apply-sql -- scripts/apply-lead-machine.sql`
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
| Tests | `npm run test:machine` |
