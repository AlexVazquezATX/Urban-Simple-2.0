# Outreach reply ingestion (Resend Inbound)

Prospect replies now flow into the CRM automatically: reply arrives →
`/api/webhooks/resend` (`email.received`) → matched to a prospect by sender
email, else by subject → `replied` activity on the timeline → latest sent message marked
`replied` → **rest of the sequence auto-cancelled**. The stats page counts
`replied` (auto-detected) + `interested` (human-judged) as replies, so
`replyRate` finally measures something real.

## One-time setup (Alex)

1. **Inbound domain** — Resend dashboard → Domains → add a receiving domain,
   e.g. `in.urbansimple.net`. Add the MX record it shows at your DNS host
   (host `in`, value/priority exactly as the dashboard displays).
2. **Webhook event** — Resend → Webhooks → the existing endpoint
   `https://www.urbansimple.net/api/webhooks/resend` → also enable the
   **email.received** event. Same endpoint, same signing secret
   (`RESEND_WEBHOOK_SECRET`), nothing else changes.
3. **Env var** — in Vercel, set `OUTREACH_REPLY_TO=reply@in.urbansimple.net`
   (any mailbox name on the inbound domain works) and redeploy. Every outreach
   send path (`send`, `send-email`, `approval-queue` send, executor) now stamps
   it as the Reply-To. Unset → behavior is exactly as before (replies go to
   your normal inbox, invisible to the CRM).
4. **Reply text** — Resend's webhook carries metadata only, so the text is
   fetched from its Received Emails API, which a sending-only key can't read.
   Create a full-access key and set it as `RESEND_RECEIVING_API_KEY`. Without
   it, replies are still recorded and routed, but with no text, no AI triage
   and no unsubscribe detection.
5. **Test** — send an outreach email to yourself, reply to it, and check the
   prospect's activity timeline for "Reply received from …".

## Behavior details

- Sender matching is case-insensitive against `ProspectContact.email`. If the
  same address appears on several prospect records (duplicates, shared owner
  inbox), the most recently contacted prospect wins.
- A sender not on file (the owner answering what went to `info@`) is matched by
  subject when exactly one prospect got that subject in the last 120 days.
- The reply body (text preferred, tag-stripped HTML fallback) is stored on the
  activity, capped at 10k chars.
- A reply cancels all still-pending messages for that prospect
  (`cancelPendingMessagesForProspect`, reason `prospect_replied`) — the same
  mechanism bounces and spam complaints use.
- Anything else still goes to the Communications Hub as needing a reply, with a
  notice to Alex (out-of-office replies are filed without one).
- The handler accepts both `email.received` and `inbound.email.received` event
  names; if the Resend dashboard shows deliveries failing, check the event
  name in the webhook logs first.

## Implementation map

| Concern | File |
|---|---|
| Inbound handler + sender parsing | `src/app/api/webhooks/resend/route.ts` |
| Reply-To injection (`outreachReplyTo`) + actor resolution | `src/lib/services/outreach-guards.ts` |
| Reply metric (`interested` + `replied`) | `src/app/api/growth/outreach/stats/route.ts` |
| Sequence stop-on-reply | executor include filters + `hasReply` |
| Dev-only simulation test | `scripts/test-inbound-reply.mjs` |
