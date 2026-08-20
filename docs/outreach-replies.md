# Outreach reply ingestion (Resend Inbound)

Prospect replies now flow into the CRM automatically: reply arrives →
`/api/webhooks/resend` (`email.received`) → matched to the prospect by sender
email → `replied` activity on the timeline → latest sent message marked
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
4. **Test** — send an outreach email to yourself, reply to it, and check the
   prospect's activity timeline for "Reply received from …".

## Behavior details

- Sender matching is case-insensitive against `ProspectContact.email`. If the
  same address appears on several prospect records (duplicates, shared owner
  inbox), the most recently contacted prospect wins.
- The reply body (text preferred, tag-stripped HTML fallback) is stored on the
  activity, capped at 10k chars.
- Replies from our own outbound From address are ignored (loop guard).
- A reply cancels all still-pending messages for that prospect
  (`cancelPendingMessagesForProspect`, reason `prospect_replied`) — the same
  mechanism bounces and spam complaints use.
- Unmatched senders are acknowledged and logged, not stored.
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
