# Claude MCP server — manage the backend from anywhere

`https://urbansimple.net/api/mcp` is a remote MCP (Model Context Protocol)
server built into the app itself. Any Claude Code session — desktop, web
(claude.ai/code), mobile — can connect to it and drive the full Urban Simple
API surface, top to bottom.

It reuses the agent auth layer built for Merc (see `docs/merc-agent.md`):
bearer API keys, per-route authorization, audit logging, burst caps, IP locks,
and the same kill switch.

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
claude mcp add --transport http urbansimple https://urbansimple.net/api/mcp \
  --header "Authorization: Bearer us_live_…"
```

## 3. Tools

| Tool | What it does |
|---|---|
| `list_endpoints` | Browse the route catalog (203+ routes), filter by prefix/search |
| `api_request` | Call any `/api/*` route: method + path + query + JSON body |

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

## 6. Phase 2 (planned): claude.ai chat connector

The claude.ai web/mobile **chat** app can only add custom connectors that
speak OAuth 2.1 (authorization-code + PKCE + dynamic client registration).
Planned work: a small OAuth layer on urbansimple.net that reuses the existing
admin login for the consent step and issues short-lived tokens backed by the
same `api_keys` infrastructure. Until then, "from anywhere" = any Claude Code
session (desktop, claude.ai/code, mobile Code), which covers management use.

## 7. Implementation map

| Concern | File |
|---|---|
| MCP endpoint (JSON-RPC, tools, self-fetch) | `src/app/api/mcp/route.ts` |
| Route catalog (generated) | `src/lib/mcp/api-catalog.json` |
| Catalog generator | `scripts/generate-api-catalog.ts` |
| Provisioning | `scripts/setup-claude.ts` |
| Envelope audit exemption | `src/lib/api-key-verify.ts` |
| Claude Code connection | `.mcp.json` (env: `URBANSIMPLE_MCP_KEY`) |
