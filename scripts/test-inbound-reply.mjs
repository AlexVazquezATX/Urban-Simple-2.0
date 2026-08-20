// Dev-only integration test for reply ingestion. Simulates a Resend
// `email.received` webhook against a LOCAL dev server (unsigned payloads are
// only accepted when RESEND_WEBHOOK_SECRET is unset outside production).
//
// Flow: create scratch prospect+contact via MCP → POST fake inbound reply to
// the webhook → assert a `replied` activity landed on the timeline → clean up.
//
// Usage: node scripts/test-inbound-reply.mjs   (key from URBANSIMPLE_MCP_KEY)
const key = process.env.URBANSIMPLE_MCP_KEY
if (!key) { console.error('set URBANSIMPLE_MCP_KEY'); process.exit(2) }
const origin = process.argv[2] ?? 'http://localhost:3000'

let failures = 0
function check(label, cond, detail = '') {
  if (!cond) failures++
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`)
}
async function mcp(argsObj) {
  const res = await fetch(`${origin}/api/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'api_request', arguments: argsObj } }),
  })
  const j = await res.json()
  const text = j.result?.content?.[0]?.text ?? ''
  let json = null
  try { json = JSON.parse(text.slice(text.indexOf('\n') + 1)) } catch { /* ignore */ }
  return { status: parseInt(text.match(/^HTTP (\d+)/)?.[1] ?? '0', 10), json }
}

const testEmail = 'inbound-reply-test@example.com'

// 1. Scratch prospect with a contact
const created = await mcp({ method: 'POST', path: '/api/growth/prospects', body: {
  companyName: 'Inbound Reply Test (safe to delete)', source: 'other',
  contacts: [{ firstName: 'Reply', lastName: 'Tester', email: testEmail }],
} })
const pid = created.json?.id
check('scratch prospect created', created.status === 200 && !!pid, `HTTP ${created.status}`)
if (!pid) process.exit(1)

// 2. Simulated inbound reply (unsigned — dev only)
const hook = await fetch(`${origin}/api/webhooks/resend`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    type: 'email.received',
    data: {
      from: `Reply Tester <${testEmail}>`,
      to: ['reply@in.urbansimple.net'],
      subject: 'Re: quick question',
      text: 'Sounds interesting — can you come by Tuesday?',
      email_id: 'inbound-simulated-1',
    },
  }),
})
const hookJson = await hook.json()
check('webhook matched prospect', hook.status === 200 && hookJson.matched === true && hookJson.prospectId === pid, JSON.stringify(hookJson))

// 3. Activity landed on the timeline
const got = await mcp({ method: 'GET', path: `/api/growth/prospects/${pid}` })
const acts = got.json?.activities ?? []
const reply = acts.find((a) => a.outcome === 'replied')
check('replied activity on timeline', !!reply, `${acts.length} activities`)
check('reply body stored', !!reply && (reply.messageBody ?? '').includes('come by Tuesday'))

// 4. Unmatched sender is acknowledged, not stored
const miss = await fetch(`${origin}/api/webhooks/resend`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ type: 'email.received', data: { from: 'nobody@never-a-prospect.example', subject: 'x', text: 'y' } }),
})
const missJson = await miss.json()
check('unmatched sender → matched:false', miss.status === 200 && missJson.matched === false, JSON.stringify(missJson))

// 5. Cleanup
const cleaned = await mcp({ method: 'POST', path: '/api/growth/prospects/bulk-delete', body: { ids: [pid] } })
check('cleanup', cleaned.status === 200)

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
