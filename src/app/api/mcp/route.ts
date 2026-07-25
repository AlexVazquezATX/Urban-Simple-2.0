// Remote MCP server — lets Claude manage the Urban Simple backend from
// anywhere over the Model Context Protocol (streamable HTTP, stateless).
//
// Auth: the same bearer API keys as every other route (us_live_…, see
// src/lib/api-key-verify.ts). The endpoint itself only checks that a valid key
// was presented; each tool call re-enters the API surface via a self-fetch
// that forwards the SAME key, so per-route auth, the BackHaus scope fence,
// burst caps, and mutation audit rows all apply exactly as they do for any
// other agent (docs/merc-agent.md). Kill the key → the MCP server 401s.
//
// Tools:
//   list_endpoints — browse the generated route catalog (npm run generate-api-catalog)
//   api_request    — call any /api/* route (full REST surface, one tool)
//
// Protocol notes: stateless JSON-RPC over POST (no Mcp-Session-Id, no SSE
// stream). Responses are plain JSON, which streamable-HTTP clients accept.

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import catalog from '@/lib/mcp/api-catalog.json'

export const maxDuration = 60

const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']
const LATEST_PROTOCOL = PROTOCOL_VERSIONS[0]

const SERVER_INFO = { name: 'urbansimple', version: '1.0.0' }

const SERVER_INSTRUCTIONS = [
  'Remote control surface for the Urban Simple backend (urbansimple.net).',
  'Use list_endpoints to discover routes, then api_request to call them.',
  'You are authenticated as a SUPER_ADMIN service account: standard REST semantics apply',
  '(GET reads, POST creates, PATCH updates, DELETE removes). Mutations are audit-logged.',
  'Prefer narrow queries (filters, pagination params) — large list responses are truncated.',
].join(' ')

const TOOLS = [
  {
    name: 'list_endpoints',
    description:
      'List the Urban Simple API routes reachable through api_request. ' +
      'Optionally filter by path prefix (e.g. "/api/clients") or a substring search. ' +
      'Dynamic segments appear in [brackets] (e.g. /api/clients/[id]).',
    inputSchema: {
      type: 'object',
      properties: {
        prefix: { type: 'string', description: 'Only routes starting with this path prefix' },
        search: { type: 'string', description: 'Only routes whose path contains this substring' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'api_request',
    description:
      'Call an Urban Simple backend API route. The request runs with the same credentials ' +
      'as this MCP connection (SUPER_ADMIN service key), so all normal authorization, ' +
      'auditing, and rate limits apply. Returns the HTTP status and response body.',
    inputSchema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          description: 'HTTP method',
        },
        path: {
          type: 'string',
          description:
            'Route path starting with /api/, with dynamic segments filled in ' +
            '(e.g. /api/clients/abc123). Do not include query parameters here.',
        },
        query: {
          type: 'object',
          description: 'Query parameters as key → value (arrays allowed for repeated params)',
          additionalProperties: true,
        },
        body: {
          description: 'JSON request body for POST/PUT/PATCH',
        },
      },
      required: ['method', 'path'],
      additionalProperties: false,
    },
  },
] as const

// Response bodies above this size are truncated — protects the model's context
// from an unfiltered list endpoint.
const MAX_BODY_CHARS = 60_000

type JsonRpcId = string | number | null

function rpcResult(id: JsonRpcId, result: unknown) {
  return { jsonrpc: '2.0' as const, id, result }
}
function rpcError(id: JsonRpcId, code: number, message: string) {
  return { jsonrpc: '2.0' as const, id, error: { code, message } }
}
function toolText(text: string, isError = false) {
  return { content: [{ type: 'text' as const, text }], isError }
}

function runListEndpoints(args: Record<string, unknown>) {
  const prefix = typeof args.prefix === 'string' ? args.prefix : null
  const search = typeof args.search === 'string' ? args.search.toLowerCase() : null
  const routes = (catalog.routes as Array<{ path: string; methods: string[] }>).filter(
    (r) =>
      (!prefix || r.path.startsWith(prefix)) &&
      (!search || r.path.toLowerCase().includes(search)),
  )
  if (routes.length === 0) return toolText('No routes matched.')
  const lines = routes.map((r) => `${r.methods.join(',')}  ${r.path}`)
  return toolText(`${routes.length} route(s):\n${lines.join('\n')}`)
}

async function runApiRequest(request: NextRequest, args: Record<string, unknown>) {
  const method = typeof args.method === 'string' ? args.method.toUpperCase() : ''
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return toolText(`Unsupported method: ${String(args.method)}`, true)
  }

  const path = typeof args.path === 'string' ? args.path : ''
  // Only the API surface is reachable, and never this endpoint itself.
  if (!/^\/api\/[a-zA-Z0-9\-_.~/%]*$/.test(path) || path.includes('..')) {
    return toolText(`Invalid path: must be a clean /api/... path (got "${path}")`, true)
  }
  if (path === '/api/mcp' || path.startsWith('/api/mcp/')) {
    return toolText('Refusing recursive call to /api/mcp.', true)
  }

  const url = new URL(path, request.nextUrl.origin)
  if (args.query && typeof args.query === 'object') {
    for (const [key, value] of Object.entries(args.query as Record<string, unknown>)) {
      for (const v of Array.isArray(value) ? value : [value]) {
        if (v !== undefined && v !== null) url.searchParams.append(key, String(v))
      }
    }
  }

  const headers: Record<string, string> = {
    authorization: request.headers.get('authorization') ?? '',
    'user-agent': `urbansimple-mcp (${request.headers.get('user-agent') ?? 'unknown client'})`,
  }
  const init: RequestInit = { method, headers, signal: AbortSignal.timeout(45_000) }
  if (method !== 'GET' && args.body !== undefined) {
    headers['content-type'] = 'application/json'
    init.body = JSON.stringify(args.body)
  }

  let response: Response
  try {
    response = await fetch(url, init)
  } catch (err) {
    return toolText(`Request failed before reaching the API: ${err instanceof Error ? err.message : String(err)}`, true)
  }

  let bodyText = await response.text()
  let truncated = false
  if (bodyText.length > MAX_BODY_CHARS) {
    bodyText = bodyText.slice(0, MAX_BODY_CHARS)
    truncated = true
  }
  const header = `HTTP ${response.status} ${method} ${url.pathname}${url.search}`
  const note = truncated
    ? `\n[response truncated at ${MAX_BODY_CHARS} chars — narrow the query with filters/pagination]`
    : ''
  return toolText(`${header}\n${bodyText}${note}`, response.status >= 400)
}

async function handleMessage(request: NextRequest, msg: Record<string, unknown>) {
  const id = (msg.id ?? null) as JsonRpcId
  const method = msg.method
  const params = (msg.params ?? {}) as Record<string, unknown>

  switch (method) {
    case 'initialize': {
      const requested = params.protocolVersion
      const protocolVersion =
        typeof requested === 'string' && PROTOCOL_VERSIONS.includes(requested)
          ? requested
          : LATEST_PROTOCOL
      return rpcResult(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: SERVER_INSTRUCTIONS,
      })
    }
    case 'ping':
      return rpcResult(id, {})
    case 'tools/list':
      return rpcResult(id, { tools: TOOLS })
    case 'tools/call': {
      const args = (params.arguments ?? {}) as Record<string, unknown>
      switch (params.name) {
        case 'list_endpoints':
          return rpcResult(id, runListEndpoints(args))
        case 'api_request':
          return rpcResult(id, await runApiRequest(request, args))
        default:
          return rpcError(id, -32602, `Unknown tool: ${String(params.name)}`)
      }
    }
    default:
      return rpcError(id, -32601, `Method not found: ${String(method)}`)
  }
}

export async function POST(request: NextRequest) {
  // Key-only endpoint: MCP clients always present the bearer key. Cookie
  // sessions are rejected so a browser can never be tricked into driving this.
  const user = await getCurrentUser()
  if (!user || !('via' in user) || user.via !== 'api_key') {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized: MCP requires an API key' } },
      { status: 401 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(rpcError(null, -32700, 'Parse error'), { status: 400 })
  }

  // Batches (array form) were removed in protocol 2025-06-18; support them
  // anyway for older clients.
  const messages = Array.isArray(body) ? body : [body]
  if (messages.some((m) => typeof m !== 'object' || m === null)) {
    return NextResponse.json(rpcError(null, -32600, 'Invalid request'), { status: 400 })
  }

  const responses = []
  for (const msg of messages as Array<Record<string, unknown>>) {
    // Notifications (no id) get no response body.
    if (msg.id === undefined || msg.id === null) continue
    responses.push(await handleMessage(request, msg))
  }

  if (responses.length === 0) return new NextResponse(null, { status: 202 })
  const payload = Array.isArray(body) ? responses : responses[0]
  return NextResponse.json(payload)
}

// Stateless server: no SSE stream to open, no session to delete.
export async function GET() {
  return NextResponse.json(
    rpcError(null, -32000, 'This MCP server is stateless — use POST'),
    { status: 405, headers: { Allow: 'POST' } },
  )
}

export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { Allow: 'POST' } })
}
