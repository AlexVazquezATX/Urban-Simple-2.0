# Claude MCP server — manage the backend from anywhere

`https://www.urbansimple.net/api/mcp` is a remote MCP (Model Context Protocol)
server built into the app itself. (Use the `www` host: the apex domain
307-redirects to `www`, and HTTP clients strip the `Authorization` header when
following a cross-origin redirect — the key silently vanishes and you get 401.) Any Claude Code session — desktop, web
(claude.ai/code), mobile — can connect to it and drive the full Urban Simple
API surface, top to bottom.

It reuses the agent auth layer built for Merc (see `docs/merc-agent.md`):
bearer API keys, per-route authorization, audit logging, burst caps, IP locks,
and the same kill switch. Two ways to authenticate:

- **API key** (`us_live_…`) — for scripted / Claude Code use, section 1–2.
- **OAuth** — for claude.ai web/mobile and any MCP client that supports it;
  no key handling at all, section 6.

---

## 1. The service account

Claude authenticates as a dedicated, key-only `SUPER_ADMIN` service account:

- `claude@urbansimple.net` (`authId = null` — can never hold a browser session)
- Scopes: `['*', 'backhaus']` — unlike Merc, Claude is **not** fenced off the
  BackHaus subtree; the opt-in `backhaus` scope is granted deliberately.
- Separate account + key from Merc, so audit trails and kill switches stay
  independent.

Provision / rotate / pin:

```bash
npm run setup-claude                  # ensure account + mint key (printed ONCE)
npm run setup-claude -- --rotate      # revoke + mint fresh
npm run setup-claude -- --ip=1.2.3.4  # pin key to source IPs (usually leave unlocked)
```

## 2. Connecting a Claude Code session

The repo's `.mcp.json` already declares the server; it reads the key from the
`URBANSIMPLE_MCP_KEY` environment variable. Set that in your shell profile (or
the cloud session's env) and any session in this repo gets the connection.

From any other machine or repo:

```bash
claude mcp add --transport http urbansimple https://www.urbansimple.net/api/mcp \
  --header "Authorization: Bearer us_live_…"
```

## 3. Tools

| Tool | What it does |
|---|---|
| `playbooks` | Urban Simple operating procedures from `docs/playbooks/*.md` ("how we onboard a manager"). Claude is instructed to read the relevant one before any multi-step business process, so work is done **to your spec**, not a generic guess. Add/edit playbooks freely — they're plain markdown, deployed with the app. |
| `list_endpoints` | Browse the route catalog (208 routes) with one-line summaries, filter by prefix/search |
| `describe_endpoint` | Per-method doc, JSON body fields, query params, "required" hints, role gate — extracted from route source at catalog time (`npm run generate-api-catalog`) |
| `api_request` | Call any `/api/*` route: method + path + query + JSON `body`, **or** multipart via `form` + base64 `files` (uploads, documents, photos; 10 MB cap) |

`api_request` executes a server-side self-fetch that forwards the caller's own
bearer key, so every call re-enters the normal API stack: middleware bridging,
`authenticateApiKey`, scope fence, mutation audit rows (`entity_type =
'agent_api'`), and route-level authorization all apply unchanged. `/api/mcp`
itself is unreachable through the tool (no recursion), and non-`/api/` paths
are rejected.

The route catalog is generated, committed JSON — regenerate after adding or
removing API routes:

```bash
npm run generate-api-catalog   # rewrites src/lib/mcp/api-catalog.json
```

### Using it from cloud sessions (Claude Code web, Cowork, mobile, routines)

Cloud sessions don't see your laptop's env var or the repo `.mcp.json` the same
way. Two paths:

- **OAuth connector (recommended)** — add `https://www.urbansimple.net/api/mcp`
  once under claude.ai → Settings → Connectors (section 6). It's then available
  in claude.ai chat, Claude Code web sessions, the mobile app, and Cowork.
- **Key path for routines / cloud environments** — set `URBANSIMPLE_MCP_KEY` in
  the cloud environment's *Environment variables*; the committed `.mcp.json`
  picks it up.

Either way, the cloud sandbox's network egress defaults to a trusted allowlist:
in claude.ai/code → Cloud environments → *Network access* → Custom, add
`www.urbansimple.net` or the connection is silently blocked.

## 4. Guardrails

- **Audit**: inner mutations are audited exactly like Merc's. The `/api/mcp`
  envelope POST itself is exempted in `api-key-verify.ts` (it would double-log
  every mutation and log reads as writes).
- **Burst cap**: each tool call consumes 2 key authentications (envelope +
  inner request), so the effective ceiling is ~150 tool calls / 60s per warm
  instance. Fine in practice.
- **Kill switch**: same as Merc — revoke the key
  (`DELETE /api/growth/api-keys/<keyId>`), or set `is_active = false` on the
  key row or on the `claude@urbansimple.net` user row.

## 5. Protocol notes

Stateless streamable-HTTP MCP: JSON-RPC over `POST`, plain JSON responses, no
SSE stream, no session IDs. Handles `initialize`, `ping`, `tools/list`,
`tools/call`; batch arrays accepted for pre-2025-06-18 clients.

## 6. OAuth: connect claude.ai (web / mobile) and any MCP client without a key

The server is also an **OAuth 2.1 authorization server**, which is what the
claude.ai chat app requires for custom connectors. No key to copy — the client
sends you to the normal admin login, you approve once, and it gets its own
revocable token.

### Connect from claude.ai (web or phone)

1. claude.ai → Settings → Connectors → **Add custom connector**
2. Name: `Urban Simple`, URL: `https://www.urbansimple.net/api/mcp` (leave
   client id/secret blank — the app registers itself)
3. Click Connect → you land on `urbansimple.net/oauth/authorize` → sign in as
   a super-admin if needed → **Approve**
4. Done. In any chat, enable the connector and ask Claude to manage the backend.

Claude Code also supports this: `claude mcp add --transport http urbansimple
https://www.urbansimple.net/api/mcp` with no header → `/mcp` → authenticate in
the browser.

### How it works

| Step | Endpoint |
|---|---|
| Discovery | `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource` (`/api/mcp` 401s with `WWW-Authenticate: Bearer resource_metadata=…`) |
| Client registration (RFC 7591) | `POST /api/oauth/register` — public, rate-limited; grants nothing by itself |
| Authorization + consent | `GET /oauth/authorize` (server-rendered page) → `POST /api/oauth/authorize` |
| Token (code + PKCE S256, refresh rotation) | `POST /api/oauth/token` |
| Revocation (RFC 7009) | `POST /api/oauth/revoke` |

- Only a **real `SUPER_ADMIN`** (checked on `realRole`, impersonation ignored)
  can approve. Approving mints a 10-minute single-use code; the client trades
  it for a 1-hour access token (`us_oat_…`) + 30-day rotating refresh token.
- The token acts **as the approving user** (e.g. alex@urbansimple.net), with
  agent scopes `['*','backhaus']`. `authenticateOAuthToken` in
  `api-key-verify.ts` runs the exact same policy as an API key: burst cap,
  BackHaus fence, mutation audit rows (`entity_type='agent_api'`). Consent
  itself is audited as `action='OAUTH_GRANT'`, `entity_type='oauth_client'`.
- PKCE `S256` is mandatory; `plain` is refused. Code replay revokes every token
  derived from that code. Refresh tokens rotate; the old pair dies. Redirect
  URIs must be `https` (or `http` loopback for local clients) and match the
  registration exactly. The consent POST is same-origin only.
- Only hashes are stored (`oauth_clients`, `oauth_authorization_codes`,
  `oauth_tokens` — `scripts/apply-oauth-schema.sql`).

### Revoking a connector

Delete its row from `oauth_clients` (cascades all its tokens), or set
`revoked_at` on specific `oauth_tokens` rows, or the client can call
`/api/oauth/revoke`. Deactivating the approving user kills everything.

### Test

```bash
npx tsx scripts/test-oauth.ts [baseUrl]   # ~30 checks: discovery, DCR, PKCE, replay, rotation, revoke, MCP access
```

## 7. Implementation map

| Concern | File |
|---|---|
| MCP endpoint (JSON-RPC, tools, self-fetch) | `src/app/api/mcp/route.ts` |
| Route catalog (generated) | `src/lib/mcp/api-catalog.json` |
| Catalog generator | `scripts/generate-api-catalog.ts` |
| Provisioning | `scripts/setup-claude.ts` |
| Envelope audit exemption | `src/lib/api-key-verify.ts` |
| Claude Code connection | `.mcp.json` (env: `URBANSIMPLE_MCP_KEY`) |
| OAuth core (token formats, PKCE, issuer) | `src/lib/oauth/core.ts` |
| OAuth discovery docs | `src/lib/oauth/metadata.ts`, `src/app/.well-known/**` |
| OAuth client registration / auth | `src/app/api/oauth/register/route.ts`, `src/lib/oauth/client-auth.ts` |
| Consent page + decision | `src/app/oauth/authorize/page.tsx`, `src/app/api/oauth/authorize/route.ts`, `src/lib/oauth/authorize.ts` |
| Token + revoke | `src/app/api/oauth/token/route.ts`, `src/app/api/oauth/revoke/route.ts` |
| OAuth token verification | `authenticateOAuthToken` / `authenticateBearer` in `src/lib/api-key-verify.ts` |
| Schema | `prisma/schema.prisma` (OAuthClient/…Code/…Token), `scripts/apply-oauth-schema.sql`, `npm run apply-sql` |
| End-to-end tests | `scripts/test-mcp.mjs` (key path, 19 checks), `scripts/test-mcp-upload.mjs` (multipart), `scripts/test-oauth.ts` (OAuth) |
| Playbooks | `docs/playbooks/*.md` (traced into the bundle via `next.config.ts` `outputFileTracingIncludes`) |
