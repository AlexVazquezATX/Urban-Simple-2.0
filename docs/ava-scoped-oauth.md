# Ava's hosted read-only CRM connection

This is an engineering proposal awaiting review and approved deployment. No
OAuth client, grant, token, staff identity or live connector was created in this
task. Production currently advertises only the broad `mcp` OAuth scope. Do not
connect Ava through the current full-backend consent screen.

## Why a separate resource

The hosted client supports OAuth, rather than a raw API-key configuration. The
new resource is `https://www.urbansimple.net/api/mcp/crm`. Its 401 challenge links
to `/.well-known/oauth-protected-resource/api/mcp/crm`, which advertises only
`crm:read`. A scope omitted for this resource defaults to `crm:read`; asking for
`mcp`, mixed scopes or wildcard access fails. The existing `/api/mcp` resource
continues to advertise/default to `mcp` for existing broad integrations.

Authorization uses the existing SUPER_ADMIN browser consent and registered
redirect URI with mandatory PKCE S256. Consent names the application, acting
user/company, exact scope, return host and 30-day limit. The new grant acts as
the consenting existing user, restricted by scope and company; it does not
provision a dedicated service user or invite anyone. Client/token IDs provide
separate connector attribution, and the grant audit records scope/resource.

## Exact permission and lifetime

New narrow authorization codes exchange into tokens with exactly
`["crm:read"]`. Code exchange and refresh require the canonical CRM resource.
Refresh cannot change scope, add a wildcard, or reset the grant's deadline.

The existing `refreshExpiresAt` column stores the original consent time plus
30 days for a narrow grant. Each rotated pair preserves this deadline. Access
tokens last up to one hour and are capped at that same absolute deadline;
bearer validation also checks the deadline and exact narrow policy. Fresh
human consent is required after expiry. No SQL/schema change is needed.

Permitted reads are the acting user's own identity, company CRM prospect list
and detail (including contacts/activities), new-lead count, and company lead
delivery health. A selected prospect detail may include its existing campaign
and message history. Normal route roles and company filters still apply.

Writes, emails/outreach sends, notification retries, API-key management, user
lists, billing/finance, operations, ads and BackHaus are denied. The MCP catalog
only describes permitted GETs; the API tool advertises GET only. Business
playbooks are unavailable under this grant. The server rechecks the scope
before self-fetch and again in bearer authentication, forwards the same
credential, rejects traversal/recursive MCP paths and refuses redirects. Broad
credentials are rejected by the new read-only resource.

Legacy `mcp` consent remains broad and truthful. Existing tokens are untouched;
legacy refresh preserves their stored scopes and rolling expiry behavior.
There is no automatic grant migration or revocation.

## Approval and connection step

After code review, return the exact merge/deployment action for approval before
publishing these security changes. This feature branch disables its automatic
Vercel Git deployment in `vercel.json`; master and other branches retain their
default deployment behavior. Do not merge or manually deploy it until approved.

After approved deployment and discovery verification, ask Alex to approve the
actual hosted application's client name/ID and redirect host, acting identity
`alex@urbansimple.net` in the verified Urban Simple company, scope exactly
`crm:read`, and 30-day absolute expiry. The hosted platform stores its own OAuth
tokens; no secret should be copied into chat or from another agent. Confirm the
actual acting account/company on screen before consent.

In the supported hosted client's custom MCP setup, enter the URL
`https://www.urbansimple.net/api/mcp/crm` and choose OAuth. Client registration
does not grant data access, but this task does not authorize starting it. Stop
at the human consent screen and verify the read-only CRM scope/company/expiry
and actual return host before Alex's action-time approval. A screen describing
full backend access means the wrong flow; do not approve it.

After consent, verify initialization/tools and narrow GETs, then verify denied
operations stop at scope checks without creating records or sending anything.
The actual hosted client's resource and refresh request behavior is unverified
until this approved round trip is performed. A future write grant requires
separate explicit approval.

## Validation and limits

`npm run test:oauth` exercises real consent/token/bearer/MCP controller logic
with offline database doubles and blocked outbound HTTP. It checks discovery,
default/explicit/mixed scopes, CSRF and consenting role, redirect/resource
binding, PKCE, code replay and failed atomic claims, public/confidential client
authentication, exact token policy, refresh rotation/escalation/expiry, bearer
denials and MCP catalog/self-fetch restrictions. `npm run test:leads` covers the
existing lead and limited-access regressions.

These tests do not prove real PostgreSQL concurrent exchanges, the complete
Next middleware/cookie pipeline, or hosted-client compatibility. The production
OAuth flow was not granted or exercised. Deployment and a controlled hosted
round trip remain separate approval/verification gates.

References: [MCP authorization](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization),
[OAuth refresh rules](https://www.rfc-editor.org/rfc/rfc6749#section-6),
[Vercel branch deployment control](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled).
