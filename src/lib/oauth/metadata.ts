// Discovery documents for the OAuth authorization server (RFC 8414) and the
// MCP protected resource (RFC 9728). Shared by the .well-known routes.
import { NextRequest, NextResponse } from 'next/server'
import { getIssuer, oauthEndpoints, OAUTH_SCOPE } from '@/lib/oauth/core'

export function authorizationServerMetadata(request: NextRequest) {
  const e = oauthEndpoints(getIssuer(request.nextUrl.origin))
  return {
    issuer: e.issuer,
    authorization_endpoint: e.authorization_endpoint,
    token_endpoint: e.token_endpoint,
    registration_endpoint: e.registration_endpoint,
    revocation_endpoint: e.revocation_endpoint,
    scopes_supported: [OAUTH_SCOPE],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
    revocation_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
    service_documentation: `${e.issuer}/docs/claude-mcp`,
  }
}

export function protectedResourceMetadata(request: NextRequest) {
  const e = oauthEndpoints(getIssuer(request.nextUrl.origin))
  return {
    resource: e.resource,
    authorization_servers: [e.issuer],
    scopes_supported: [OAUTH_SCOPE],
    bearer_methods_supported: ['header'],
    resource_name: 'Urban Simple backend (MCP)',
  }
}

// Discovery docs are public and fetched by MCP clients from anywhere.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version',
  'Cache-Control': 'public, max-age=300',
}

export function metadataResponse(body: unknown) {
  return NextResponse.json(body, { headers: CORS })
}
export function metadataOptions() {
  return new NextResponse(null, { status: 204, headers: CORS })
}
