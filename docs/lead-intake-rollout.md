# Reliable walkthrough intake

## Behavior

`POST /api/leads` validates the form and commits the existing CRM prospect,
contact, receipt, and delivery jobs in one Prisma transaction. It needs no
`US_CRM_API_KEY` or loopback HTTP. If any write fails, all writes roll back and
the form returns `503`, `ok: false`, and `Retry-After: 30`. Notification failure
after a committed receipt does not lose the lead or ask the visitor to resubmit.
The public success response means **saved**, with notifications queued.

The browser keeps a UUID for retries of an unchanged form. Reusing an ID with
different data returns `409`; a replay with the same data reuses the receipt.
Exact-content repeats within 15 minutes also collapse across form instances and
clients without IDs. Database advisory locks serialize races across instances.
Later distinct requests remain distinct; this does not merge unrelated CRM records
by contact email or reset an existing prospect's stage/owner.

UTM source, medium, campaign, content (creative), and referrer remain in the
prospect's `discoveryData` and immutable receipt. `utm_content` is optional and
limited to 200 characters, like the other UTM fields. Missing or empty content
leaves campaign attribution intact; invalid types or longer values return `400`
before any writes. Existing JSON storage needs no database migration. Set
`LEAD_OWNER_USER_ID` to Demian's verified staff ID
if walkthroughs should be assigned automatically. The ID must be active and
belong to the intake company. Julio's estimating/staffing and Alex's pricing
handoff remain existing business procedures. This change sends no Slack alert.

## Production rollout (requires separate approval)

1. Confirm the approved production database and make a recoverable backup.
   Apply only `scripts/apply-lead-intake.sql` using the established SQL workflow:
   `npm run apply-sql -- scripts/apply-lead-intake.sql`. It adds two tables,
   foreign keys, indexes, and server-only RLS with no browser policies. It does
   not rewrite prospects. Do not run a general `prisma db push` or replay the
   historical migration baseline; this repo also evolves through additive SQL.
2. Confirm `DATABASE_URL`, `RESEND_API_KEY`, verified sender domains for
   `leads@urbansimple.net` and `alex@urbansimple.net`, `NOTIFICATION_EMAIL`, and
   `CRON_SECRET` are configured in the owning deployment. Never print values.
   Set `LEAD_COMPANY_ID` explicitly to the verified Urban Simple company ID.
   Without it, intake requires exactly one company named `Urban Simple LLC`.
   Optional `LEAD_BRANCH_ID` must be an active branch in that company; otherwise
   the active `AUS` branch is used if unambiguous, or the branch stays unassigned.
3. Review optional `WALKTHROUGH_OUTREACH_SEQUENCE_ID` before enabling it. Intake
   freezes that ID in its job. Enrollment is local, atomic, company checked,
   duplicate guarded, and respects `doNotContact`. The existing sequence's
   autopilot/approval rules still govern subsequent sends. For the approved QA
   inquiry **hold enrollment before submitting** (e.g. leave this optional setting
   unset for the approved rollout/test window). Do not rely on its label alone
   to prevent outreach. Restore/enable a sequence only with explicit approval.
4. Build and deploy the reviewed commit through the owning hosting account.
   `vercel.json` adds `GET /api/cron/lead-deliveries` every five minutes, with a
   60-second function budget. Confirm the hosting plan supports this cadence and
   actually schedules the authenticated worker; a preview deploy is not proof.
5. Check authenticated `GET /api/growth/lead-deliveries` for backlog/failed jobs
   and confirm a worker run. Do not call the worker as a harmless probe when jobs
   are queued: it sends emails and may enroll leads.
6. Only after deployment approval, submit the separately approved inquiry with
   a unique `TEST ONLY` label, `alex@urbansimple.net`, explicit QA UTMs, and empty
   phone (optional). Use one UUID and replay it once to verify one receipt,
   one CRM prospect/contact, and one job per channel. Verify email provider IDs,
   inbox receipt, campaign data, and owner. The approved Sales alert requires
   a separately authorized operator action/integration; this implementation
   contains no Slack sender.

Schema-first rollout is safe for the previous code. Rolling the application back
retains queued records; keep/recover a delivery worker to drain them. Do not drop
the new tables during rollback, or accepted receipts and retries will be lost.

## Delivery operations

The worker claims one row using `FOR UPDATE SKIP LOCKED`, with a two-minute
lease and a unique fencing token. Expired leases recover crashed workers. Each
channel is independent, so a failed notification does not resend an accepted
autoresponder. Email HTML/body is frozen before the provider call, with a stable
`lead/<delivery-id>` idempotency key, a ten-second HTTP timeout, and no redirects.
Provider rejection or missing message IDs are failures, never successful sends.
`sent` means provider accepted, not proven inbox delivery.

Failures persist a sanitized error code, attempts, and next attempt time. The
worker logs only job ID, channel, status, and error code. Automatic retries use
exponential backoff (1 to 60 minutes), with at most eight attempts and a 23-hour
window from the first attempt. [Resend retains idempotency keys for 24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys),
so uncertain outcomes older than the safe window require provider reconciliation
before any new send.

`GET /api/growth/lead-deliveries` is company scoped and requires ADMIN or
SUPER_ADMIN. It returns status counts, up to 100 attention rows, and the oldest
pending timestamp without request bodies or contact details. Alert on terminal
failures or a backlog older than ten minutes. Do not assume cron is working just
because form receipts succeed.

After fixing configuration, an authorized admin can call
`POST /api/growth/lead-deliveries/<id>/retry` to requeue a failed job inside its
23-hour window. It preserves the frozen body/key. Expired/unknown/cross-company
jobs return `409`. This action can lead to real sends; read-only Ava cannot call it.

## Tracking verification

Public GET on October 5, 2026 returned HTTP 200 for the deployed walkthrough page
with Meta pixel **5492474750842307**. The HTML did not contain older pixel
372490320973356 or a GA4 ID. Local `.env.local` has the same public Meta pixel;
`NEXT_PUBLIC_GA4_ID` is unset locally. No secret settings were disclosed.

Source initializes PageView in the walkthrough layout. The updated form emits
browser `Lead` and GA4 `generate_lead` only after a committed, nonduplicate
receipt. There is no server Conversions API event. The HTML read verifies the
deployed pixel configuration, not an actual conversion or delivery of this new
form behavior; the approved live QA must verify the deployed commit. An initial
response lost in transit may undercount browser conversions, while the retry
still preserves the lead. Advertising spend/launch is a separate approval.

## Local checks

`npm run test:leads` uses database doubles and intercepted HTTP exclusively.
It checks transaction boundaries, validation, replay/conflict behavior,
attribution, provider failure, retry windows, worker recovery, and scopes.
It does not prove a production SQL migration, scheduler, inbox delivery, or
concurrent execution on a real PostgreSQL instance. Those require staging/QA.
