// Smoke-test the /api/mcp MCP server: handshake, tools, auth rejection,
// recursion/path guards, BackHaus reachability.
//
// Usage:
//   node scripts/test-mcp.mjs [baseUrl]            # key from URBANSIMPLE_MCP_KEY
//   node scripts/test-mcp.mjs --key-file=<path> [baseUrl]
//
// Default baseUrl: http://localhost:3000/api/mcp
import { readFileSync } from 'fs'

const keyFileArg = process.argv.find((a) => a.startsWith('--key-file='))
const key = keyFileArg
  ? readFileSync(keyFileArg.slice('--key-file='.length), 'utf8').trim()
  : process.env.URBANSIMPLE_MCP_KEY
if (!key) {
  console.error('No key: set URBANSIMPLE_MCP_KEY or pass --key-file=<path>')
  process.exit(2)
}
const base = process.argv.filter((a) => !a.startsWith('--key-file='))[2] ?? 'http://localhost:3000/api/mcp'
console.log(`Testing ${base}\n`)

let failures = 0
async function post(body, { auth = true } = {}) {
  const res = await fetch(base, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(auth ? { authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json = null
  try { json = JSON.parse(text) } catch { /* non-JSON (e.g. 202 empty) */ }
  return { status: res.status, json, text }
}

function check(label, cond, detail = '') {
  if (!cond) failures++
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`)
}

let r = await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke-test', version: '1.0' } } })
check('initialize 200', r.status === 200)
check('protocolVersion echoed', r.json?.result?.protocolVersion === '2025-06-18')
check('serverInfo.name', r.json?.result?.serverInfo?.name === 'urbansimple')

r = await post({ jsonrpc: '2.0', method: 'notifications/initialized' })
check('notification → 202', r.status === 202)

r = await post({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
const tools = r.json?.result?.tools?.map((t) => t.name) ?? []
check('tools/list has both tools', tools.includes('api_request') && tools.includes('list_endpoints'), tools.join(','))

r = await post({ jsonrpc: '2.0', id: 3, method: 'tools/list' }, { auth: false })
check('unauthenticated → 401', r.status === 401)

r = await post({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'list_endpoints', arguments: { prefix: '/api/clients' } } })
const listText = r.json?.result?.content?.[0]?.text ?? ''
check('list_endpoints prefix filter', listText.includes('/api/clients/[id]'), listText.split('\n')[0])

r = await post({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'api_request', arguments: { method: 'GET', path: '/api/clients' } } })
const clientsText = r.json?.result?.content?.[0]?.text ?? ''
check('api_request GET /api/clients → 200', clientsText.startsWith('HTTP 200'), clientsText.slice(0, 60).replace(/\n/g, ' '))
check('success not flagged isError', r.json?.result?.isError === false)

r = await post({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'api_request', arguments: { method: 'POST', path: '/api/mcp' } } })
check('recursion refused', (r.json?.result?.content?.[0]?.text ?? '').includes('recursive') && r.json?.result?.isError === true)

r = await post({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'api_request', arguments: { method: 'GET', path: '/dashboard' } } })
check('non-/api/ path refused', r.json?.result?.isError === true)

r = await post({ jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'api_request', arguments: { method: 'GET', path: '/api/admin/studio-clients/stats' } } })
const bhText = r.json?.result?.content?.[0]?.text ?? ''
check('BackHaus route reachable (scope granted)', bhText.startsWith('HTTP 200'), bhText.slice(0, 60).replace(/\n/g, ' '))

r = await post({ jsonrpc: '2.0', id: 9, method: 'bogus/method' })
check('unknown method → -32601', r.json?.error?.code === -32601)

r = await post({ jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'describe_endpoint', arguments: { path: '/api/users' } } })
const descText = r.json?.result?.content?.[0]?.text ?? ''
check('describe_endpoint /api/users lists body fields', descText.includes('body fields:') && descText.includes('firstName') && descText.includes('roles: SUPER_ADMIN, ADMIN'), descText.split('\n').find((l) => l.includes('body fields')) ?? '')

r = await post({ jsonrpc: '2.0', id: 11, method: 'tools/call', params: { name: 'describe_endpoint', arguments: { path: '/api/clients/abc123' } } })
check('describe_endpoint matches concrete path to [id] route', (r.json?.result?.content?.[0]?.text ?? '').startsWith('/api/clients/[id]'))

r = await post({ jsonrpc: '2.0', id: 12, method: 'tools/call', params: { name: 'playbooks', arguments: {} } })
const pbList = r.json?.result?.content?.[0]?.text ?? ''
check('playbooks lists onboard-manager', pbList.includes('onboard-manager'), pbList.split('\n')[0])

r = await post({ jsonrpc: '2.0', id: 13, method: 'tools/call', params: { name: 'playbooks', arguments: { name: 'onboard-manager' } } })
check('playbooks returns content', (r.json?.result?.content?.[0]?.text ?? '').includes('POST /api/users'))

r = await post({ jsonrpc: '2.0', id: 14, method: 'tools/call', params: { name: 'playbooks', arguments: { name: '../../package' } } })
check('playbooks rejects path traversal', r.json?.result?.isError === true)

r = await post({ jsonrpc: '2.0', id: 15, method: 'tools/list' })
const toolNames = r.json?.result?.tools?.map((t) => t.name) ?? []
check('tools/list has 4 tools', toolNames.length === 4 && toolNames.includes('describe_endpoint') && toolNames.includes('playbooks'), toolNames.join(','))

// ---- Write round-trip: the body must actually persist, not just 200 ----
// Regression for the claude.ai double-encode bug: `body` is sent as a
// JSON-ENCODED STRING here on purpose. Creates a scratch prospect, PATCHes
// notes + a contact, re-GETs and asserts the DATA changed, then deletes it.
async function apiReq(id, argsObj) {
  const res = await post({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'api_request', arguments: argsObj } })
  const text = res.json?.result?.content?.[0]?.text ?? ''
  const nl = text.indexOf('\n')
  let json = null
  try { json = JSON.parse(text.slice(nl + 1)) } catch { /* non-JSON body */ }
  return { text, status: parseInt(text.match(/^HTTP (\d+)/)?.[1] ?? '0', 10), json }
}

const created = await apiReq(20, { method: 'POST', path: '/api/growth/prospects', body: { companyName: 'MCP Smoke Test (safe to delete)', source: 'other', notes: 'created by scripts/test-mcp.mjs' } })
check('write: create scratch prospect', created.status === 200 || created.status === 201, `HTTP ${created.status}`)
const pid = created.json?.id ?? created.json?.prospect?.id
if (pid) {
  const patched = await apiReq(21, { method: 'PATCH', path: `/api/growth/prospects/${pid}`,
    body: JSON.stringify({ notes: 'round-trip-ok', contacts: [{ firstName: 'Round', lastName: 'Trip', email: 'roundtrip@example.com' }] }) })
  check('write: PATCH with STRING body → 200', patched.status === 200, `HTTP ${patched.status}`)
  const got = await apiReq(22, { method: 'GET', path: `/api/growth/prospects/${pid}` })
  const gotP = got.json?.prospect ?? got.json
  check('write: notes actually persisted', gotP?.notes === 'round-trip-ok', `notes=${JSON.stringify(gotP?.notes)}`)
  check('write: contact persisted with email', Array.isArray(gotP?.contacts) && gotP.contacts.some((c) => c.email === 'roundtrip@example.com'), `contacts=${gotP?.contacts?.length}`)

  const emptyPatch = await apiReq(23, { method: 'PATCH', path: `/api/growth/prospects/${pid}`, body: {} })
  check('write: empty PATCH → 400, not silent 200', emptyPatch.status === 400, `HTTP ${emptyPatch.status}`)

  const cleaned = await apiReq(24, { method: 'POST', path: '/api/growth/prospects/bulk-delete', body: { ids: [pid] } })
  check('write: scratch prospect cleaned up', cleaned.status === 200, `HTTP ${cleaned.status}`)
} else {
  failures++
  console.log('FAIL  write: could not create scratch prospect — skipping round-trip')
}

// ---- Pagination envelope ----
const paged = await apiReq(25, { method: 'GET', path: '/api/growth/prospects', query: { limit: 10, page: 1 } })
check('pagination: {data, pagination} envelope', Array.isArray(paged.json?.data) && paged.json?.pagination?.limit === 10, `keys=${paged.json ? Object.keys(paged.json).join(',') : 'none'}`)
check('pagination: ≤10 records', (paged.json?.data?.length ?? 99) <= 10, `${paged.json?.data?.length} records`)
check('pagination: under 60k chars (not truncated)', !paged.text.includes('[response truncated'), `${paged.text.length} chars`)
check('pagination: lean (no discoveryData)', !(paged.json?.data ?? []).some((p) => 'discoveryData' in p && p.discoveryData !== undefined))

const badStatus = await apiReq(26, { method: 'GET', path: '/api/growth/prospects', query: { status: 'NEW', limit: 1 } })
check('status filter is case-insensitive', badStatus.status === 200, `HTTP ${badStatus.status}`)
const invalidStatus = await apiReq(27, { method: 'GET', path: '/api/growth/prospects', query: { status: 'bogus' } })
check('invalid status → 400 naming valid values', invalidStatus.status === 400 && (invalidStatus.json?.validStatuses ?? []).includes('new'))

// ---- Sorting + priority filter ----
const newest = await apiReq(28, { method: 'GET', path: '/api/growth/prospects', query: { sortBy: 'createdAt', sortOrder: 'desc', limit: 5 } })
const newestDates = (newest.json?.data ?? []).map((p) => p.createdAt)
check('sortBy=createdAt desc actually sorts', newestDates.length > 1 && newestDates.every((d, i) => i === 0 || d <= newestDates[i - 1]), newestDates.slice(0, 3).join(' > '))
const oldest = await apiReq(29, { method: 'GET', path: '/api/growth/prospects', query: { sortBy: 'createdAt', sortOrder: 'asc', limit: 5 } })
const oldestFirst = oldest.json?.data?.[0]?.createdAt
check('sortOrder=asc flips the order', !!oldestFirst && !!newestDates[0] && oldestFirst < newestDates[0], `asc[0]=${oldestFirst}`)
const badSort = await apiReq(30, { method: 'GET', path: '/api/growth/prospects', query: { sortBy: 'bogus', limit: 1 } })
check('invalid sortBy → 400 naming valid fields', badSort.status === 400 && (badSort.json?.validSortFields ?? []).includes('createdAt'))
const highPri = await apiReq(31, { method: 'GET', path: '/api/growth/prospects', query: { priority: 'HIGH', limit: 5 } })
check('priority filter (case-insensitive)', highPri.status === 200 && (highPri.json?.data ?? []).every((p) => p.priority === 'high'), `${highPri.json?.data?.length ?? 0} rows`)
const badPri = await apiReq(32, { method: 'GET', path: '/api/growth/prospects', query: { priority: 'bogus' } })
check('invalid priority → 400 naming valid values', badPri.status === 400 && (badPri.json?.validPriorities ?? []).includes('urgent'))

// ---- Approval-queue action enum ----
const badAction = await apiReq(33, { method: 'POST', path: '/api/growth/outreach/approval-queue', body: { messageIds: ['nonexistent'], action: '__probe_invalid__' } })
check('approval-queue: unknown action → 400 naming valid actions', badAction.status === 400 && (badAction.json?.validActions ?? []).includes('unreject'), (badAction.json?.validActions ?? []).join(','))
const noAction = await apiReq(34, { method: 'POST', path: '/api/growth/outreach/approval-queue', body: { messageIds: ['nonexistent'] } })
check('approval-queue: missing action → 400', noAction.status === 400)
const unrejNothing = await apiReq(35, { method: 'POST', path: '/api/growth/outreach/approval-queue', body: { messageIds: ['nonexistent'], action: 'unreject' } })
check('approval-queue: unreject is a valid action', unrejNothing.status === 200 && unrejNothing.json?.updated === 0, JSON.stringify(unrejNothing.json))

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
