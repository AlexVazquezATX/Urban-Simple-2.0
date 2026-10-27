# Outreach deliverability guards

Cold outreach was bouncing on ~10% of sends (guessed addresses, never verified)
from the same domain clients and billing mail use. These guards keep bad
addresses out and make every email CAN-SPAM compliant.

## What every outreach send now does

| Guard | Behavior |
|---|---|
| **Recipient** | New messages pin the best contact when created (`pickRecipient`: verified > unverified > catch-all, decision-makers first, oldest as tiebreak) and greet that same person. At send time: an operator-typed address wins, then the pinned contact. Older unpinned rows go to the oldest usable contact (how they were greeted), and an unpinned follow-up goes to whoever got step 1. Sent messages record `recipient_email` + `contact_id`. |
| **Verification gate** | `checkSendable`: an address that hard-bounced, or whose owner opted out, on any of the company's records is blocked for everyone (this also stops a CSV re-import of someone who unsubscribed). Inbound leads (`website`, `meta`, `meta_lead_ad`, `referral`) otherwise pass with a well-formed address. Everyone else must verify `valid`: unverified addresses are checked on demand (Abstract, then Hunter, max 25 lookups per executor run) and the result is saved on the contact. Catch-all ("risky") and unverifiable addresses are blocked for sequences; Quick Compose one-offs a person typed are allowed through, and the approval-queue `send` action accepts `allowUnverified: true`. Blocked messages are skipped, not cancelled, and show the reason. |
| **Bounce suppression** | A hard bounce (Resend `email.bounced`) marks that address `bounced` on every company contact that carries it. (`invalid` means a verifier said undeliverable; that blocks cold sends only.) |
| **Footer + headers** | Plain-text part alongside HTML; footer with postal address and an opt-out line; `List-Unsubscribe` (mailto + one-click URL) and `List-Unsubscribe-Post`. |
| **Unsubscribe link** | `/api/outreach/unsubscribe` (public, HMAC-signed, ids only, no email in the URL). GET shows a confirm button (link scanners prefetch GETs); POST marks the prospect, and any duplicate record with the same address, Do Not Contact and cancels pending messages. |
| **Autopilot cap** | The daily cap is spent on actual sends, so gate-blocked messages don't starve the ones behind them. |
| **Stats** | Internal test prospects (contacts at our own sending domains) are excluded. The hardcoded "AI insights" are gone. |

## Rollout (in order)

1. **Apply the schema** before deploying. It's additive and idempotent:
   `npm run apply-sql -- scripts/apply-outreach-recipient.sql`
2. **Set env vars in Vercel:**
   - `OUTREACH_POSTAL_ADDRESS`: e.g. `Urban Simple LLC, PO Box 123, Austin, TX 78701`. Required by CAN-SPAM; until set, emails go out without it and the server logs a warning.
   - `OUTREACH_UNSUBSCRIBE_SECRET`: any long random string. Falls back to `CRON_SECRET` if unset; changing it later invalidates links already sent.
   - `NEXT_PUBLIC_APP_URL` must be the https production URL (it's used to build the unsubscribe link).
   - `ABSTRACT_API_KEY` and/or `HUNTER_API_KEY` for verification. With neither, every cold address stays `address_unverified` and nothing cold sends.
3. **Deploy.**
4. **Test:** send a Quick Compose email to your own address on a prospect, confirm the footer, the Gmail "Unsubscribe" link next to the sender, and that the opt-out page works.

## Implementation map

| Concern | File |
|---|---|
| Recipient pick, gate, bounce suppression | `src/lib/services/outreach-recipient.ts` |
| HTML/text body, footer, headers, unsubscribe tokens | `src/lib/services/outreach-email.ts` |
| Unsubscribe endpoint | `src/app/api/outreach/unsubscribe/route.ts` |
| Send paths | `src/app/api/growth/outreach/{executor,approval-queue,send,send-email}/route.ts` |
| Tests | `npm run test:outreach` |
