# Onboard a new manager

How Urban Simple sets up a MANAGER, written from how the platform actually
works. Follow it in order; report what you did and what you skipped.

## How managers work in this platform (read first)

- A manager's **scope is their branch**. `users.branchId` decides what the
  manager dashboard, tonight's route, nightly reviews, review flags, and
  issues show. A manager with **no branchId sees the whole company** — never
  leave it blank.
- Managers are attached to locations through the location's dispatch profile:
  `serviceProfile.defaultManagerId`. Nightly dispatch generation puts that
  manager on every future shift for that location automatically.
- Individual shifts carry `managerId`; already-generated shifts do **not**
  update themselves when the default changes.
- `POST /api/location-assignments` (with `monthlyPay`) is for **associates**
  (cleaners) — do not use it for managers.
- A login exists only if a `password` is provided on create (or later via
  `PATCH /api/users/[id]`). Without it the record exists but they can't sign in.

## Before you start (gather from the requester)

- Full name, work/personal email, mobile phone
- Branch (Austin unless told otherwise) — `GET /api/branches`
- Which locations they will run, and from what date
- Whether they need a login today (then a temporary password)
- Whether they take over any *already scheduled* shifts

Ask for anything missing before creating records. Never invent an email,
phone, or password.

## Steps

1. **Check for an existing account** — `GET /api/users?includeInactive=true`,
   search by email. If found and inactive: `PATCH /api/users/[id]`
   `{ "isActive": true, "role": "MANAGER", "branchId": "…" }` and skip to step 3.

2. **Create the user** — `POST /api/users`
   ```json
   {
     "email": "…", "firstName": "…", "lastName": "…",
     "displayName": "First L.", "phone": "+1512…",
     "role": "MANAGER", "branchId": "<branch id from /api/branches>",
     "password": "<temporary password — only if they need a login today>"
   }
   ```
   `password` also creates their Supabase login (email pre-confirmed). To
   add a login later: `PATCH /api/users/[id]` `{ "password": "…" }`.

3. **Make them the default manager of their locations** — for each location:
   - `GET /api/locations` and pick the location (it includes `serviceProfile`).
   - `PATCH /api/locations/[id]` with the **entire existing `serviceProfile`
     object copied back, changing only `defaultManagerId`**:
     ```json
     { "serviceProfile": { …existing fields…, "defaultManagerId": "<new user id>" } }
     ```
     A partial `serviceProfile` resets cadence, service days, times, and
     priority to defaults — always send the full object.

4. **Existing scheduled shifts** (only if the requester wants a handover of
   already-generated shifts): `GET /api/shifts?locationId=…&startDate=YYYY-MM-DD`
   then `PUT /api/shifts/[id]` `{ "managerId": "<new user id>" }` on each.
   Otherwise skip — future nightly generation picks them up from step 3.

5. **Team chat** — `GET /api/chat/channels`; if there is a company-wide or
   branch/ops channel, `POST /api/chat/channels/[channelId]/members`
   `{ "userIds": ["<new user id>"] }`. Skip if no obvious channel exists.

6. **Verify** — `GET /api/users/[id]` shows role MANAGER + correct branch;
   `GET /api/locations` shows `defaultManagerId` on each of their locations.

7. **Report back**: user id, login status (created / not yet), branch,
   locations they now default-manage, shifts reassigned (count + date range),
   channels joined, and anything skipped for lack of information. If a
   temporary password was set, hand it back in the chat and say to change it
   on first login.

## Do not

- Create SUPER_ADMIN or ADMIN accounts under this playbook — escalate to Alex.
- Email credentials to anyone.
- Send a partial `serviceProfile` (see step 3).
- Delete, deactivate, or reassign any other user while onboarding.
