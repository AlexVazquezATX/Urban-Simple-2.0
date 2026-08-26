# Communications Hub

Every email in or out of the business — outreach, billing, portal,
transactional, and inbound replies — in one queryable store
(`comm_messages`) with one screen (`/communications`).

## The three doors

1. **The Hub** (`/communications`, sidebar → Growth → Comms Hub, SUPER_ADMIN/ADMIN)
   - **Needs attention**: inbound mail awaiting a human, AI-classified
     (interested / not interested / question / ooo / unsubscribe) with a
     one-line summary. OOO auto-replies skip the inbox. Mark done / reopen.
   - **All correspondence**: the firehose — filter by category, search
     subject/body/address, paginated.
   - **Message drawer**: full thread (grouped by counterpart + normalized
     subject), triage buttons, and a **reply composer** — replies send via
     Resend with `In-Reply-To` headers so they land in the sender's existing
     thread, and are logged automatically. **Draft with AI** pre-fills the
     composer following the house rules (no em dashes, no placeholders, no
     invented facts, walkthrough/email CTAs, signs as Alex). Nothing sends
     without a human clicking Send.
2. **Client pages** — a Communications card on each client showing recent
   invoices/reminders/replies, linking into the hub.
3. **Contact search** — `/communications?contact=<email>` (the hub's search
   also matches addresses), showing everything for a person across records.

## What feeds it

| Source | Category | Where wired |
|---|---|---|
| Outreach sends (all 4 paths) | `outreach` | approval-queue send, executor, send, send-email |
| Invoice emails + payment reminders | `billing` | `src/lib/email.ts` |
| Inbound replies (Resend Inbound) | `reply` | `/api/webhooks/resend` (`email.received`) |
| Delivery lifecycle | stamps | webhook delivered/opened/clicked/bounced → `stampCommByResendId` |

Logging is fire-and-forget (`src/lib/comms/log.ts`): a hub failure can never
break a send. AI classification (`src/lib/comms/classify.ts`, Gemini) is
enrichment only; an explicit `unsubscribe` classification also sets the
prospect Do Not Contact.

## SLA nudges

Command Center attention (`/api/command/attention`) lists inbound messages in
`needs_reply`; anything waiting >48h escalates to high urgency.

## API

| Route | What |
|---|---|
| `GET /api/communications` | feed; `view=attention\|all`, `category`, `direction`, `state`, `contact`, `q`, `clientId`, `prospectId`, `invoiceId`, `limit/page/offset` → `{data, pagination, counts}` |
| `GET /api/communications/[id]` | message + thread + entity names |
| `PATCH /api/communications/[id]` | `triageState` (`needs_reply\|done\|snoozed`), `assignedToId`, `snoozedUntil` |
| `POST /api/communications/[id]/reply` | `{body, subject?}` → threaded send + log + mark done |
| `POST /api/communications/[id]/draft` | AI draft for the composer (nothing stored/sent) |

## Setup / operations

```bash
npm run apply-sql -- scripts/apply-comms-schema.sql   # create the table (one-time)
npm run backfill-comms                                # import history (idempotent, rerunnable)
```

Backfill sources: sent `OutreachMessage` rows (with tracking stamps),
`EmailLog` (the previously write-only invoice/reminder log), and inbound
`ProspectActivity` replies (marked done as historical).
