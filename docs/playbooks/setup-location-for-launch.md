# Set up a location for launch

How to make one location fully live on the closed loop: the crew sees it in
My Night, runs its checklist, flags anything not done, the manager is alerted,
and the client's on-site contact hears about unfinished work before they walk
in. The **Launch readiness** page (`/operations/setup`) shows which of these
pieces each location is missing. Work top to bottom; report what you did.

## How the loop works (read first)

- **Associate shifts** come from **location assignments**. An assignment with
  nights (`daysOfWeek`, 0=Sun..6=Sat) and a cleaning window
  (`cleaningWindowStart` / `cleaningWindowEnd`, "HH:MM") generates one shift
  per night. The weekly cron keeps 14 nights filled; you can fill now with
  `POST /api/operations/associate-shifts`.
- **Manager review routes** come from the location's dispatch profile
  (`serviceProfile`): `defaultManagerId` is also who gets alerted first.
- **Client alerts** go to `ClientContact` rows on the client that have
  `alertEmail` and/or `alertSms` on, and whose `locationIds` include the
  location (an empty list means every location of that client).
- Text alerts need consent. Only turn `alertSms` on when the client contact
  agreed to receive service alert texts. A STOP reply turns it off
  automatically and sets `smsOptedOutAt`; never turn it back on after that.

## Before you start (gather from the requester)

- Which location (name or id)
- Which checklist template to use, or which areas it needs
- Which associate(s) clean it, which nights, start and end time, monthly pay
- Which manager is responsible
- Who at the client should be alerted (name, email, mobile), by email, text, or both,
  and whether they agreed to texts

Ask for anything missing. Never invent an email, phone number, pay rate, or consent.

## Steps

1. **Find the location** — `GET /api/locations`, pick it, note `id`, `clientId`,
   `checklistTemplateId` and `serviceProfile`.

2. **Checklist** — if `checklistTemplateId` is empty:
   - `GET /api/checklists` and reuse a template that fits, or create one with
     `POST /api/checklists` using items from `GET /api/checklist-library`
     (every library item has English `text` and Spanish `textEs`; copy both so
     the crew can read it in Spanish).
   - `PATCH /api/locations/[id]` `{ "checklistTemplateId": "…" }`.

3. **Default manager** — `PATCH /api/locations/[id]` with the **entire existing
   `serviceProfile` object copied back, changing only `defaultManagerId`**. A
   partial `serviceProfile` resets cadence, days and times to defaults.

4. **Crew assignment** — `POST /api/location-assignments` (admin only, it carries pay):
   ```json
   {
     "locationId": "…", "userId": "<associate id>", "monthlyPay": 1200,
     "startDate": "2026-11-01",
     "daysOfWeek": [1, 2, 3, 4, 5], "cleaningWindowStart": "22:00", "cleaningWindowEnd": "02:00"
   }
   ```
   For an existing assignment missing nights/hours: `PUT /api/location-assignments/[id]`
   with just `daysOfWeek`, `cleaningWindowStart`, `cleaningWindowEnd`.

5. **Fill shifts** — `POST /api/operations/associate-shifts` `{ "days": 14 }`
   (or `{ "assignmentId": "…" }` for just this one). It never duplicates or
   resurrects a cancelled shift. Check the response: `skippedIncomplete` > 0
   means an assignment is still missing nights or hours.

6. **Client alert contacts** — `GET /api/clients/[clientId]/contacts`. For each
   person who should be alerted at this location, create or update the contact:
   ```json
   {
     "firstName": "…", "lastName": "…", "email": "…", "phone": "+1512…",
     "role": "operations",
     "alertEmail": true,
     "alertSms": true, "smsConsent": true,
     "locationIds": ["<this location id>"]
   }
   ```
   Leave `locationIds` empty only when they should hear about **every** location
   of that client. For a resort with many outlets (Horseshoe Bay), give each
   outlet's on-site lead only their own outlets.

7. **Verify** — reload `/operations/setup`: the location row should be all green
   (Twilio may still show amber until texting is approved). Tell the requester
   what was set and anything you skipped.

## Don't

- Don't put managers on `location-assignments` (that is crew + pay).
- Don't enable text alerts without the contact's consent, or after a STOP.
- Don't create test issues against real clients: alerts go out to real people.
