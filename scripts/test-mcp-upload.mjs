// Verify api_request multipart support end-to-end: sends a tiny PNG through
// /api/mcp → /api/upload (which validates type/size and stores in Supabase).
// Usage: node scripts/test-mcp-upload.mjs [baseUrl]   (key from URBANSIMPLE_MCP_KEY)
const key = process.env.URBANSIMPLE_MCP_KEY
if (!key) { console.error('set URBANSIMPLE_MCP_KEY'); process.exit(2) }
const base = process.argv[2] ?? 'http://localhost:3000/api/mcp'

// 1x1 transparent PNG
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

const res = await fetch(base, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
  body: JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: 'api_request', arguments: {
      method: 'POST', path: '/api/upload',
      form: { folder: 'clients' },
      files: [{ field: 'file', filename: 'mcp-test.png', contentType: 'image/png', dataBase64: png }],
    } },
  }),
})
const json = await res.json()
const text = json.result?.content?.[0]?.text ?? JSON.stringify(json)
console.log(text.slice(0, 300))
const ok = text.startsWith('HTTP 200') || text.startsWith('HTTP 201')
console.log(ok ? '\nPASS multipart upload via api_request' : '\nFAIL multipart upload')
process.exit(ok ? 0 : 1)
