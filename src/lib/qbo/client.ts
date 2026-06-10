/**
 * QuickBooks Online API client: OAuth 2.0 + authenticated requests.
 *
 * Env vars (all required for the integration to be considered configured):
 *   QBO_CLIENT_ID      Intuit app client id
 *   QBO_CLIENT_SECRET  Intuit app client secret
 *   QBO_REDIRECT_URI   e.g. https://portal.urbansimple.net/api/qbo/callback
 *   QBO_ENVIRONMENT    'production' (default) or 'sandbox'
 *
 * Intuit rotates the refresh token on every refresh, so the old one is dead
 * the moment a refresh succeeds. Never cache tokens outside the DB row.
 */
import { prisma } from '@/lib/db'
import type { QBOConnection } from '@prisma/client'

const AUTHORIZE_URL = 'https://appcenter.intuit.com/connect/oauth2'
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
const SCOPE = 'com.intuit.quickbooks.accounting'

function apiBase() {
  return process.env.QBO_ENVIRONMENT === 'sandbox'
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com'
}

export function qboConfigured(): boolean {
  return Boolean(
    process.env.QBO_CLIENT_ID &&
    process.env.QBO_CLIENT_SECRET &&
    process.env.QBO_REDIRECT_URI
  )
}

export function getAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.QBO_CLIENT_ID!,
    response_type: 'code',
    scope: SCOPE,
    redirect_uri: process.env.QBO_REDIRECT_URI!,
    state,
  })
  return `${AUTHORIZE_URL}?${params.toString()}`
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number // seconds, access token
  x_refresh_token_expires_in: number // seconds, refresh token
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const basic = Buffer.from(
    `${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(body).toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`QBO token request failed (${res.status}): ${text}`)
  }
  return res.json()
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  return tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.QBO_REDIRECT_URI!,
  })
}

function tokenExpiries(tokens: TokenResponse) {
  const now = Date.now()
  return {
    accessTokenExpiresAt: new Date(now + tokens.expires_in * 1000),
    refreshTokenExpiresAt: new Date(now + tokens.x_refresh_token_expires_in * 1000),
  }
}

export async function saveConnection(params: {
  companyId: string
  realmId: string
  tokens: TokenResponse
  connectedById?: string
}): Promise<QBOConnection> {
  const { accessTokenExpiresAt, refreshTokenExpiresAt } = tokenExpiries(params.tokens)
  const data = {
    realmId: params.realmId,
    accessToken: params.tokens.access_token,
    refreshToken: params.tokens.refresh_token,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    isActive: true,
    connectedById: params.connectedById ?? null,
  }
  return prisma.qBOConnection.upsert({
    where: { companyId: params.companyId },
    create: { companyId: params.companyId, ...data },
    update: data,
  })
}

/** Returns a connection with a fresh access token, refreshing if needed. */
export async function getActiveConnection(companyId: string): Promise<QBOConnection> {
  const connection = await prisma.qBOConnection.findUnique({ where: { companyId } })
  if (!connection || !connection.isActive) {
    throw new Error('QuickBooks is not connected for this company')
  }
  if (connection.refreshTokenExpiresAt < new Date()) {
    throw new Error('QuickBooks refresh token expired. Reconnect from the Billing page.')
  }

  // Refresh when within 5 minutes of expiry.
  if (connection.accessTokenExpiresAt.getTime() - Date.now() > 5 * 60 * 1000) {
    return connection
  }

  const tokens = await tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: connection.refreshToken,
  })
  const { accessTokenExpiresAt, refreshTokenExpiresAt } = tokenExpiries(tokens)
  return prisma.qBOConnection.update({
    where: { companyId },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    },
  })
}

/** Run a QBO SQL-ish query, e.g. "SELECT * FROM Invoice WHERE Balance > '0'". */
export async function qboQuery<T = Record<string, unknown>>(
  companyId: string,
  query: string
): Promise<T[]> {
  const connection = await getActiveConnection(companyId)
  const url =
    `${apiBase()}/v3/company/${connection.realmId}/query` +
    `?query=${encodeURIComponent(query)}&minorversion=75`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`QBO query failed (${res.status}): ${text.slice(0, 500)}`)
  }

  const json = await res.json()
  const response = json.QueryResponse ?? {}
  // The entity key matches the FROM table (Invoice, Payment, Customer, ...).
  const entityKey = Object.keys(response).find(
    (k) => Array.isArray(response[k])
  )
  return entityKey ? (response[entityKey] as T[]) : []
}

/** Paginate a QBO query until fewer than pageSize rows come back. */
export async function qboQueryAll<T = Record<string, unknown>>(
  companyId: string,
  baseQuery: string,
  pageSize = 100,
  maxRows = 5000
): Promise<T[]> {
  const all: T[] = []
  let start = 1
  while (all.length < maxRows) {
    const rows = await qboQuery<T>(
      companyId,
      `${baseQuery} STARTPOSITION ${start} MAXRESULTS ${pageSize}`
    )
    all.push(...rows)
    if (rows.length < pageSize) break
    start += pageSize
  }
  return all
}
