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

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
