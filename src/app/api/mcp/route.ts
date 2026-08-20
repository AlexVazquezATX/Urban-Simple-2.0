// Remote MCP server — lets Claude manage the Urban Simple backend from
// anywhere over the Model Context Protocol (streamable HTTP, stateless).
//
// Auth: any bearer credential the API accepts — an API key (us_live_…) or an
// OAuth access token issued by our own authorization server (us_oat_…, see
// src/app/api/oauth/*). The endpoint itself only checks that a valid
// credential was presented; each tool call re-enters the API surface via a
// self-fetch that forwards the SAME credential, so per-route auth, the
// BackHaus scope fence, burst caps, and mutation audit rows all apply exactly
// as they do for any other agent (docs/merc-agent.md). Revoke it → 401.
//
// An unauthenticated request gets `WWW-Authenticate: Bearer resource_metadata=…`
// pointing at /.well-known/oauth-protected-resource, which is how MCP clients
// (claude.ai, Claude Code) discover the OAuth flow automatically.
//
// Tools:
//   list_endpoints    — browse the generated route catalog (npm run generate-api-catalog)
//   describe_endpoint — body fields / query params / role gate / docs for one route
//   api_request       — call any /api/* route (full REST surface, one tool; JSON or multipart)
//   playbooks         — Urban Simple operating procedures (docs/playbooks/*.md) to follow "to spec"
//
// Protocol notes: stateless JSON-RPC over POST (no Mcp-Session-Id, no SSE
// stream). Responses are plain JSON, which streamable-HTTP clients accept.

import { NextRequest, NextResponse } from 'next/server'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { getCurrentUser } from '@/lib/auth'
import { getIssuer, oauthEndpoints } from '@/lib/oauth/core'
import catalog from '@/lib/mcp/api-catalog.json'

type HandlerInfo = { doc?: string; body?: string[]; query?: string[]; required?: string[]; roles?: string[]; multipart?: boolean }
type RouteInfo = { path: string; methods: string[]; summary?: string; handlers: Record<string, HandlerInfo> }
const ROUTES = catalog.routes as unknown as RouteInfo[]

// Playbooks live in docs/playbooks/*.md and are traced into the serverless
// bundle via next.config `outputFileTracingIncludes`.
const PLAYBOOKS_DIR = join(process.cwd(), 'docs', 'playbooks')

export const maxDuration = 60

const PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']
const LATEST_PROTOCOL = PROTOCOL_VERSIONS[0]

const SERVER_INFO = { name: 'urbansimple', version: '1.1.0' }

const SERVER_INSTRUCTIONS = [
  'Remote control surface for the Urban Simple backend (urbansimple.net).',
  'Workflow: call playbooks first when asked to do a business process (onboarding, billing, etc.) so you follow the house procedure;',
  'use list_endpoints / describe_endpoint to discover routes and their body fields, then api_request to call them.',
  'You are authenticated with SUPER_ADMIN privileges: standard REST semantics apply',
  '(GET reads, POST creates, PATCH updates, DELETE removes). Mutations are audit-logged.',
  'Prefer narrow queries (filters, pagination params) — large list responses are truncated.',
].join(' ')

const TOOLS = [
  {
    name: 'list_endpoints',
    description:
      'List the Urban Simple API routes reachable through api_request, with a one-line summary each. ' +
      'Optionally filter by path prefix (e.g. "/api/clients") or a substring search. ' +
      'Dynamic segments appear in [brackets] (e.g. /api/clients/[id]). Use describe_endpoint for details.',
    inputSchema: {
      type: 'object',
      properties: {
        prefix: { type: 'string', description: 'Only routes starting with this path prefix' },
        search: { type: 'string', description: 'Only routes whose path or summary contains this substring' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'describe_endpoint',
    description:
      'Describe one API route: per-method doc, JSON body fields, query params, "required" hints, and role gate, ' +
      'extracted from the route source. Pass the catalog path with [brackets] (e.g. /api/clients/[id]) or a concrete path.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Route path, e.g. /api/users or /api/clients/[id]' },
      },
      required: ['path'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: 'api_request',
    description:
      'Call an Urban Simple backend API route. The request runs with the same credentials ' +
      'as this MCP connection (SUPER_ADMIN), so all normal authorization, ' +
      'auditing, and rate limits apply. Returns the HTTP status and response body. ' +
      'Send JSON via `body`, or multipart/form-data via `form` + `files` (base64) for upload routes.',
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
          description:
            'JSON request body for POST/PUT/PATCH. Pass a JSON object/array directly ' +
            '(a JSON-encoded string is tolerated but discouraged).',
        },
        form: {
          type: 'object',
          description: 'Multipart text fields (key → string). Use with `files` for upload routes.',
          additionalProperties: { type: 'string' },
        },
        files: {
          type: 'array',
          description:
            'Multipart file parts (base64-encoded). Presence of `files` or `form` switches the request to multipart/form-data.',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string', description: 'Form field name the route expects (often "file")' },
              filename: { type: 'string' },
              contentType: { type: 'string', description: 'MIME type, e.g. application/pdf' },
              dataBase64: { type: 'string', description: 'File bytes, base64' },
            },
            required: ['field', 'filename', 'dataBase64'],
            additionalProperties: false,
          },
        },
      },
      required: ['method', 'path'],
      additionalProperties: false,
    },
  },
  {
    name: 'playbooks',
    description:
      'Urban Simple operating procedures ("how we do X here"): onboarding a manager, setting up a client, ' +
      'billing runs, etc. Call with no arguments to list them; pass `name` to read one. ' +
      'ALWAYS consult the relevant playbook before performing a multi-step business process so it is done to spec.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Playbook name (filename without .md), e.g. "onboard-manager"' },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
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
  const routes = ROUTES.filter(
    (r) =>
      (!prefix || r.path.startsWith(prefix)) &&
      (!search || r.path.toLowerCase().includes(search) || (r.summary ?? '').toLowerCase().includes(search)),
  )
  if (routes.length === 0) return toolText('No routes matched.')
  const lines = routes.map((r) => {
    const firstDoc = Object.values(r.handlers).find((h) => h.doc)?.doc
    const summary = (r.summary || firstDoc || '').replace(/\s+/g, ' ').slice(0, 110)
    return `${r.methods.join(',').padEnd(18)} ${r.path}${summary ? `  — ${summary}` : ''}`
  })
  return toolText(`${routes.length} route(s):\n${lines.join('\n')}`)
}

/** Match a concrete path (e.g. /api/clients/abc) to a catalog route with [params]. */
function findRoute(path: string): RouteInfo | undefined {
  const exact = ROUTES.find((r) => r.path === path)
  if (exact) return exact
  const segs = path.split('/').filter(Boolean)
  return ROUTES.find((r) => {
    const rs = r.path.split('/').filter(Boolean)
    if (rs.length !== segs.length) return false
    return rs.every((seg, i) => (seg.startsWith('[') && seg.endsWith(']')) || seg === segs[i])
  })
}

function runDescribeEndpoint(args: Record<string, unknown>) {
  const path = typeof args.path === 'string' ? args.path.trim() : ''
  const route = path ? findRoute(path) : undefined
  if (!route) return toolText(`No route matches "${path}". Use list_endpoints to browse.`, true)
  const out: string[] = [route.path]
  if (route.summary) out.push(route.summary)
  for (const method of route.methods) {
    const h = route.handlers[method] ?? {}
    out.push('', `${method}${h.multipart ? '  (multipart/form-data — use api_request form/files)' : ''}`)
    if (h.doc) out.push(`  ${h.doc}`)
    if (h.roles?.length) out.push(`  roles: ${h.roles.join(', ')}`)
    if (h.query?.length) out.push(`  query: ${h.query.join(', ')}`)
    if (h.body?.length) out.push(`  body fields: ${h.body.join(', ')}`)
    if (h.required?.length) out.push(`  required: ${h.required.join(' | ')}`)
  }
  out.push('', 'Note: fields are extracted from source heuristically; a 400 response will name anything missing.')
  return toolText(out.join('\n'))
}

function listPlaybookFiles(): string[] {
  try {
    return readdirSync(PLAYBOOKS_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.slice(0, -3))
      .sort()
  } catch {
    return []
  }
}

function runPlaybooks(args: Record<string, unknown>) {
  const name = typeof args.name === 'string' ? args.name.trim() : ''
  const names = listPlaybookFiles()
  if (!name) {
    if (names.length === 0) return toolText('No playbooks yet. Add markdown files under docs/playbooks/ in the repo.')
    const lines = names.map((n) => {
      let title = ''
      try {
        const first = readFileSync(join(PLAYBOOKS_DIR, `${n}.md`), 'utf8').split('\n').find((l) => l.startsWith('# '))
        title = first ? first.slice(2).trim() : ''
      } catch {
        /* ignore */
      }
      return `- ${n}${title ? ` — ${title}` : ''}`
    })
    return toolText(`${names.length} playbook(s):\n${lines.join('\n')}`)
  }
  if (!/^[a-z0-9\-_]+$/i.test(name) || !names.includes(name)) {
    return toolText(`Unknown playbook "${name}". Available: ${names.join(', ') || '(none)'}`, true)
  }
  return toolText(readFileSync(join(PLAYBOOKS_DIR, `${name}.md`), 'utf8'))
}

/**
 * MCP clients (claude.ai among them) sometimes pass structured tool arguments
 * as JSON-ENCODED STRINGS rather than objects. Forwarding such a string
 * through JSON.stringify double-encodes it: the route's request.json() parses
 * to a string, every field read comes back undefined, and a PATCH silently
 * no-ops with 200. Coerce: strings that parse as JSON become the parsed
 * value; strings that don't are a hard tool error (never forward junk).
 */
function coerceJsonArg(value: unknown, label: string): { ok: true; value: unknown } | { ok: false; error: string } {
  if (typeof value !== 'string') return { ok: true, value }
  const trimmed = value.trim()
  if (!trimmed) return { ok: true, value: undefined }
  try {
    return { ok: true, value: JSON.parse(trimmed) }
  } catch {
    return {
      ok: false,
      error:
        `\`${label}\` was passed as a string that is not valid JSON. ` +
        `Pass ${label} as a JSON object (preferred) or a JSON-encoded string.`,
    }
  }
}

async function runApiRequest(request: NextRequest, args: Record<string, unknown>) {
  const method = typeof args.method === 'string' ? args.method.toUpperCase() : ''
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return toolText(`Unsupported method: ${String(args.method)}`, true)
  }

  // Un-stringify structured args before any of them are used below.
  for (const label of ['body', 'query', 'form', 'files'] as const) {
    const coerced = coerceJsonArg(args[label], label)
    if (!coerced.ok) return toolText(coerced.error, true)
    args = { ...args, [label]: coerced.value }
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
  const files = Array.isArray(args.files) ? (args.files as Array<Record<string, unknown>>) : null
  const form = args.form && typeof args.form === 'object' ? (args.form as Record<string, unknown>) : null
  if (method !== 'GET' && (files || form)) {
    // Multipart: text fields + base64-decoded file parts. fetch sets the
    // boundary header itself.
    const fd = new FormData()
    for (const [k, v] of Object.entries(form ?? {})) if (v !== undefined && v !== null) fd.append(k, String(v))
    for (const f of files ?? []) {
      const field = typeof f.field === 'string' ? f.field : 'file'
      const filename = typeof f.filename === 'string' ? f.filename : 'upload.bin'
      const contentType = typeof f.contentType === 'string' ? f.contentType : 'application/octet-stream'
      const data = typeof f.dataBase64 === 'string' ? f.dataBase64 : ''
      const bytes = Buffer.from(data, 'base64')
      if (bytes.length > 10 * 1024 * 1024) return toolText(`File ${filename} exceeds the 10 MB MCP upload limit`, true)
      fd.append(field, new Blob([new Uint8Array(bytes)], { type: contentType }), filename)
    }
    init.body = fd
  } else if (method !== 'GET' && args.body !== undefined) {
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
        case 'describe_endpoint':
          return rpcResult(id, runDescribeEndpoint(args))
        case 'playbooks':
          return rpcResult(id, runPlaybooks(args))
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

function unauthorized(request: NextRequest, message: string) {
  const e = oauthEndpoints(getIssuer(request.nextUrl.origin))
  return NextResponse.json(
    { jsonrpc: '2.0', id: null, error: { code: -32001, message } },
    {
      status: 401,
      headers: {
        'WWW-Authenticate': `Bearer realm="urbansimple", resource_metadata="${e.protected_resource_metadata}"`,
      },
    },
  )
}

export async function POST(request: NextRequest) {
  // Bearer-only endpoint: MCP clients always present a key or OAuth token.
  // Cookie sessions are rejected so a browser can never be tricked into
  // driving this.
  const user = await getCurrentUser()
  if (!user || !('via' in user) || !user.via) {
    return unauthorized(request, 'Unauthorized: MCP requires an API key or OAuth access token')
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
