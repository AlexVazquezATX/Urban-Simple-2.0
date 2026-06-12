# Mercury ("Merc") — full-access backend agent

Merc is a headless agent (controlled over Telegram, running on a dedicated box) with
**full, admin-equivalent programmatic access** to the Urban Simple backend.

He authenticates as a dedicated, **key-only `SUPER_ADMIN` service account**
(`merc@urbansimple.net`, `authId = null` — he can never hold a browser session).
His one boundary: **BackHaus is fenced off**.

---

## 1. Authenticating

Every request carries a bearer API key:

```
Authorization: Bearer us_live_xxxxxxxx…
```

Base URL (production): `https://urbansimple.net`

```bash
curl -s https://urbansimple.net/api/clients \
  -H "Authorization: Bearer us_live_…"
```

The key resolves to the Merc service account on the server (`getCurrentUser()` →
`authenticateApiKey()`), so **every** API route that already authenticates a user
now accepts Merc's key — no per-route wiring.

Cookie sessions always win: if a request somehow has both a session cookie and a
key, the cookie user is used. Merc has no cookie, so he's always the key user.

---

## 2. What Merc can reach

Merc is `SUPER_ADMIN`, so he reaches the whole Urban Simple API surface, e.g.:

| Group | Examples | Notes |
|---|---|---|
| Clients / locations | `/api/clients`, `/api/clients/{id}`, `/api/clients/{id}/billing-preview` | Ops core |
| Shifts / dispatch | `/api/shifts`, `/api/shifts/{id}`, `/api/shifts/generate` | Scheduling |
| Checklists | `/api/checklists`, `/api/checklists/{id}` | Service templates |
| Invoices / billing | `/api/invoices`, `/api/invoices/{id}`, `…/sync-qb` | Financials |
| QuickBooks | `/api/qbo/*` | QBO sync/status |
| Users / admin | `/api/users`, `/api/users/{id}`, `/api/admin/analytics`, `/api/admin/pulse/*` | SUPER_ADMIN surfaces |
| Growth / CRM | `/api/growth/prospects`, `/api/growth/outreach/*`, `/api/growth/discovery/*` | Leads, outreach |
| AI assistant | `/api/ai/conversations/*` | Cassie |
| Portal | `/api/portal/*` | Client portal admin side |

Standard REST verbs apply per route (`GET` read, `POST`/`PATCH`/`DELETE` write).

### Fenced off — BackHaus
The BackHaus product (backhaus.ai) shares this backend. Merc's key is **denied**
(HTTP `401`) on the BackHaus subtree:

- `/api/admin/studio-clients/**`
- `/api/studio/**`

Those paths require the opt-in `backhaus` scope, and the wildcard `*` does **not**
grant it. The fence is enforced fail-closed in the Node auth layer
(`api-key-verify.ts`) — the request authenticates as no one, so the handler
responds 401. (`/api/creative-studio` and `/api/creative-hub` are Urban Simple's
own tools and are **not** fenced.)

### Pages are off-limits
A key aimed at any non-`/api/` path (a server-rendered page) is redirected to
`/login`. Merc exists only on the API surface.

---

## 3. Provisioning / rotating / locking the key

Run from the repo (loads `.env.local` automatically):

```bash
# Ensure the account + mint a key if none exists (prints the raw key ONCE)
npm run setup-merc

# Replace the key (revokes the old one, mints a fresh one)
npm run setup-merc -- --rotate

# Pin the active key to Merc's box IP(s) — comma-separated
npm run setup-merc -- --ip=203.0.113.7
```

The raw key is shown **once** at creation and is never recoverable (only its
SHA-256 hash is stored). Lost it? `--rotate`.

---

## 4. Guardrails

- **IP lock** (`allowedIps`): currently **unlocked** (`[]`). Pin it to Merc's
  static IP with `--ip=…` for the single biggest safeguard — a leaked key then
  only works from his box. (Note: Vercel's `x-forwarded-for` left hop is
  spoofable, so treat this as defense-in-depth, not the sole control.)
- **Audit trail**: every Merc **mutation** (non-GET) is recorded to `audit_logs`
  with `entity_type = 'agent_api'`, `action = <HTTP method>`, `entity_id = <path>`,
  plus IP + user-agent. Routes that already write per-record audit entries still
  do so. Review with:
  ```sql
  select created_at, action, entity_id, ip_address
  from audit_logs
  where user_id = '<merc user id>'
  order by created_at desc limit 100;
  ```
- **Burst cap**: a best-effort per-key limit (300 req / 60s per warm instance)
  backstops a runaway loop. The authoritative control is the kill switch.

---

## 5. Kill switch

Revoke instantly (the key 401s on the next request):

```bash
curl -X DELETE https://urbansimple.net/api/growth/api-keys/<keyId> \
  -H "Authorization: Bearer <an admin key or session>"
```

…or set `is_active = false` on the `api_keys` row directly. To shut Merc down
entirely, set `is_active = false` on his `users` row — auth rejects an inactive
owner regardless of key state.

---

## 6. Implementation map

| Concern | File |
|---|---|
| Key verification, IP lock, burst cap, **BackHaus fence, audit write** | `src/lib/api-key-verify.ts` |
| Cookie→key fallback, `getAuthenticatedUser`, reads bridged path/method | `src/lib/auth.ts` |
| Scope model, BackHaus prefixes | `src/lib/agent-scopes.ts` |
| Page bounce + bridges real path/method to the Node layer as headers | `src/middleware.ts` |
| Provisioning | `scripts/setup-merc.ts` |
| `allowedIps` column | `prisma/schema.prisma`, `scripts/apply-merc-ip-allowlist.sql` |

> Why the split: Edge middleware can't reliably reach the DB in every
> environment, so the fence + audit live in the Node/Prisma layer. Middleware
> only does what's DB-free: the page bounce and bridging the trusted path/method
> down as `x-agent-path` / `x-agent-method` headers.
