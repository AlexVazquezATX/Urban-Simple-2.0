# Onboard a new manager

> Draft procedure, grounded in the current API. Alex: edit freely — this file
> is what Claude follows whenever asked to "add a manager" through the MCP
> connector, so make it say exactly what you want done.

## Before you start (gather from the requester)

- Full legal name, personal email, mobile phone
- Which branch (Austin is the default; `GET /api/users?role=MANAGER` shows
  existing managers and their `branchId` if unsure)
- Which locations they will run, and from what date
- Whether they should have a login right away (needs a temporary password)

Confirm anything missing **before** creating records. Never invent an email.

## Steps

1. **Check for an existing account** — `GET /api/users?includeInactive=true`
   and look for the email. If found and inactive, reactivate with
   `PATCH /api/users/[id]` `{ "isActive": true, "role": "MANAGER" }` instead
   of creating a duplicate.

2. **Create the user** — `POST /api/users`
   ```json
   {
     "email": "...", "firstName": "...", "lastName": "...",
     "displayName": "First L.", "phone": "+1512...",
     "role": "MANAGER", "branchId": "<branch id or omit for Austin default>",
     "password": "<temporary password, only if they need a login today>"
   }
   ```
   Passing `password` also creates their Supabase login; omit it to create the
   record only.

3. **Assign locations** — for each location they will manage,
   `POST /api/location-assignments`
   `{ "locationId": "...", "userId": "<new user id>", "monthlyPay": <number>, "startDate": "YYYY-MM-DD" }`.
   Find location ids with `GET /api/locations` (filter by client name).
   `monthlyPay` is required by the API; use the figure the requester gave, or
   ask — do not guess pay.

4. **Team chat** — add them to the relevant channels:
   `GET /api/chat/channels`, then
   `POST /api/chat/channels/[channelId]/members` `{ "userIds": ["<new user id>"] }`
   for the company-wide channel and their branch/ops channel.

5. **Schedule visibility** — if they take over shifts immediately, list the
   upcoming shifts for their locations (`GET /api/shifts?locationId=…&startDate=…`)
   and set `managerId` on them via `PATCH /api/shifts/[id]`.

6. **Report back** with: user id, login status (created / not yet), locations
   assigned with start dates, channels joined, and anything you skipped because
   the requester didn't provide it.

## Do not

- Create SUPER_ADMIN or ADMIN accounts under this playbook — escalate to Alex.
- Email credentials to anyone; hand the temporary password back in the chat
  and tell the requester to have them change it on first login.
- Delete or deactivate any other user while onboarding.
