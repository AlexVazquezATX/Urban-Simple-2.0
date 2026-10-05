# Ava's minimum CRM connection

Code changes do not establish a live connection. No service account, key,
OAuth grant, or connector configuration was created for Ava in this task.
Do not share Claude's, Merc's, or another agent's credential.

For a hosted OAuth client, see [Ava scoped OAuth](ava-scoped-oauth.md). That
proposal requires approved deployment and separate action-time consent; no
connection is established by the code. The key-only option below is suitable
only for a client that supports an independent protected bearer credential.

## Optional key-only grant

After this code is deployed, request action-time approval for a dedicated,
key-only Ava service user in the verified Urban Simple company, with role
`ADMIN`, `authId = null`, one key scoped **exactly `["crm:read"]`**, a 30-day
expiry, and independent revocation/audit attribution. Store the raw key only
in the approved secret store under `AVA_URBANSIMPLE_MCP_KEY`; do not print it
in chat, commit it, or reuse the shared `URBANSIMPLE_MCP_KEY`. Connect that new
credential to `https://www.urbansimple.net/api/mcp` via an Authorization bearer
header sourced from that approved secret store.

That action creates persistent read access to CRM contacts and lead records.
Alex must approve the identity, company, exact scope, expiry, secret destination,
and connector setup before provisioning/configuring it. A shorter expiry can be
chosen at approval time. No credential provisioning script was run or included.

The new `crm:read` policy permits:

- MCP `POST` protocol envelopes (including tools/list and endpoint documentation).
- `GET /api/users/me` for its own identity.
- `GET /api/growth/prospects` and prospect detail/activities/new-leads-count.
- `GET /api/growth/lead-deliveries` for delivery health.

It blocks CRM writes, email/outreach sends, notification retries, API-key
management, users lists, billing/QBO, operations, ads, and BackHaus. Company
filters and normal route roles continue to apply. Catalog visibility describes
routes; it does not grant access. Scope checks run in bearer authentication and
before MCP self-fetch, including public endpoints. Missing path/method context
fails closed for this limited key. A supplied bearer cannot fall back to a more
privileged cookie session. MCP refuses encoded path traversal and redirects.

The existing key-creation API accepts explicit `scopes: ["crm:read"]` and returns
the key once. It binds the key to the authenticated user. Creating a key while
signed in as Alex therefore **does not create the dedicated Ava service identity**;
provision that identity/key through the separately approved administration flow.
Omitting scopes retains legacy UI behavior and is not a limited grant. Existing
empty-scope and wildcard keys retain their existing broad behavior; other catalog
scope names remain labels rather than newly enforced restrictions.

## OAuth boundary

Current OAuth advertises `mcp`, requires SUPER_ADMIN consent, and issues token
agent scopes `["*", "backhaus"]`. That is full backend access, including
financial/admin surfaces. Do not approve Ava through that flow to obtain a
supposedly read-only connection. The scoped OAuth proposal uses a separate
read-only resource after approved deployment. The legacy `/api/mcp` consent
remains broad. Do not open/approve an OAuth consent flow
without returning its exact scope/action to Alex for approval.

After approval and provisioning, verify the new identity and allowed CRM GETs,
then verify denied requests without generating records or sending messages.
Source tests cover the permission matrix; they are not proof that a deployed
connector uses the new key. The existing registered local MCP tools were not
called because their credential belongs to a previously connected identity.
