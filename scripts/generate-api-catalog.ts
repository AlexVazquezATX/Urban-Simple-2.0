// Generate the API endpoint catalog served by the MCP server
// (src/app/api/mcp/route.ts → `list_endpoints` / `describe_endpoint`).
//
// Scans src/app/api/**/route.ts and, per HTTP handler, extracts (heuristically,
// from source) what an agent needs to call it without reading the code:
//   - doc comment immediately preceding the handler
//   - JSON body fields (destructured from `body`, `body.x` accesses, zod keys)
//   - query params (`searchParams.get('x')`)
//   - "required" hints (400 error strings mentioning required fields)
//   - role gate (role literals compared against `user.role`)
//   - whether it reads multipart formData
//
// Writes src/lib/mcp/api-catalog.json (committed — regenerate when routes change):
//   npm run generate-api-catalog
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, relative, sep } from 'path'

const API_DIR = join(process.cwd(), 'src', 'app', 'api')
const OUT_FILE = join(process.cwd(), 'src', 'lib', 'mcp', 'api-catalog.json')

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] as const
type Method = (typeof HTTP_METHODS)[number]
const ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE', 'CLIENT_USER']

export interface HandlerInfo {
  doc?: string
  body?: string[]
  query?: string[]
  required?: string[]
  roles?: string[]
  multipart?: boolean
}
export interface RouteInfo {
  path: string
  methods: Method[]
  summary?: string
  handlers: Partial<Record<Method, HandlerInfo>>
}

function findRouteFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...findRouteFiles(full))
    else if (entry.name === 'route.ts' || entry.name === 'route.tsx') out.push(full)
  }
  return out
}

function routePath(file: string): string {
  const rel = relative(join(process.cwd(), 'src', 'app'), file)
  const noFile = rel.split(sep).slice(0, -1).join('/')
  return '/' + noFile.split('/').filter((seg) => !(seg.startsWith('(') && seg.endsWith(')'))).join('/')
}

const uniq = (xs: string[]) => Array.from(new Set(xs))
const IDENT = /^[A-Za-z_$][\w$]*$/

/** Comment block (JSDoc or // lines) ending right before `idx`. */
function precedingComment(src: string, idx: number): string | undefined {
  const before = src.slice(0, idx).replace(/\s+$/, '')
  // JSDoc
  // Tempered so it grabs only the LAST block (never spans from an earlier one).
  const jsdoc = before.match(/\/\*\*((?:(?!\/\*\*)[\s\S])*?)\*\/\s*$/)
  if (jsdoc) {
    return jsdoc[1]
      .split('\n')
      .map((l) => l.replace(/^\s*\*\s?/, '').trim())
      .filter((l) => l && !l.startsWith('@'))
      .join(' ')
      .trim()
  }
  // Consecutive // lines
  const lines = before.split('\n')
  const collected: string[] = []
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trim()
    if (t.startsWith('//')) collected.unshift(t.replace(/^\/\/\s?/, ''))
    else break
  }
  const text = collected.join(' ').trim()
  return text || undefined
}

function analyzeHandler(seg: string): HandlerInfo {
  const info: HandlerInfo = {}

  // Body fields: `const { a, b: c, d = 1 } = body` (or `= await request.json()`)
  const bodyFields: string[] = []
  for (const m of seg.matchAll(/const\s*\{([^}]*)\}\s*=\s*(?:body|await\s+(?:request|req)\.json\(\)|data|payload|input)\b/g)) {
    for (const raw of m[1].split(',')) {
      const name = raw.split(/[:=]/)[0].trim()
      if (IDENT.test(name)) bodyFields.push(name)
    }
  }
  for (const m of seg.matchAll(/\bbody\.([A-Za-z_$][\w$]*)/g)) bodyFields.push(m[1])
  // zod: z.object({ key: … }) — top-level keys only (approximate)
  for (const m of seg.matchAll(/z\.object\(\s*\{([\s\S]*?)\}\s*\)/g)) {
    for (const k of m[1].matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:/gm)) bodyFields.push(k[1])
  }
  if (bodyFields.length) info.body = uniq(bodyFields)

  // Query params
  const q = [...seg.matchAll(/searchParams\.get\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1])
  if (q.length) info.query = uniq(q)

  // Required hints from 400 error strings
  const req = [...seg.matchAll(/error:\s*['"`]([^'"`]*required[^'"`]*)['"`]/gi)]
    .map((m) => m[1].trim())
    .filter((t) => !/^forbidden/i.test(t))
  if (req.length) info.required = uniq(req)

  // Role gates: role literals compared to user.role / realRole
  const roleHits: string[] = []
  for (const m of seg.matchAll(/(?:user\.role|realRole|user\.realRole)[^\n;]*?(?:'|")(SUPER_ADMIN|ADMIN|MANAGER|ASSOCIATE|CLIENT_USER)/g)) roleHits.push(m[1])
  for (const m of seg.matchAll(/\[((?:\s*['"](?:SUPER_ADMIN|ADMIN|MANAGER|ASSOCIATE|CLIENT_USER)['"]\s*,?)+)\]\s*\.includes\(\s*(?:user\.)?(?:role|realRole)/g)) {
    for (const r of m[1].matchAll(/['"](\w+)['"]/g)) roleHits.push(r[1])
  }
  if (roleHits.length) info.roles = ROLES.filter((r) => roleHits.includes(r))

  if (/\.formData\(\)/.test(seg)) info.multipart = true
  return info
}

function analyzeFile(src: string): { methods: Method[]; handlers: Partial<Record<Method, HandlerInfo>>; summary?: string } {
  const handlers: Partial<Record<Method, HandlerInfo>> = {}
  const starts: { method: Method; idx: number }[] = []
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD)\b/g)) {
    starts.push({ method: m[1] as Method, idx: m.index! })
  }
  for (const m of src.matchAll(/export\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD)\s*=/g)) {
    starts.push({ method: m[1] as Method, idx: m.index! })
  }
  starts.sort((a, b) => a.idx - b.idx)
  for (let i = 0; i < starts.length; i++) {
    const { method, idx } = starts[i]
    const end = i + 1 < starts.length ? starts[i + 1].idx : src.length
    const seg = src.slice(idx, end)
    const info = analyzeHandler(seg)
    const doc = precedingComment(src, idx)
    if (doc) info.doc = doc.slice(0, 400)
    handlers[method] = info
  }
  // File-level summary: first comment block at top of file (skip imports).
  const top = src.match(/^(?:\s*(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/)\s*)+/)
  let summary: string | undefined
  if (top) {
    summary = top[0]
      .split('\n')
      .map((l) => l.replace(/^\s*(\/\/|\/\*\*?|\*\/|\*)\s?/, '').trim())
      .filter(Boolean)
      .join(' ')
      .slice(0, 300)
    if (/eslint|@ts-|prettier/i.test(summary)) summary = undefined
  }
  const methods = HTTP_METHODS.filter((m) => m in handlers)
  return { methods, handlers, summary }
}

const routes: RouteInfo[] = findRouteFiles(API_DIR)
  .map((file) => {
    const { methods, handlers, summary } = analyzeFile(readFileSync(file, 'utf8'))
    return { path: routePath(file), methods, summary, handlers }
  })
  .filter((r) => r.methods.length > 0)
  .sort((a, b) => a.path.localeCompare(b.path))

mkdirSync(join(process.cwd(), 'src', 'lib', 'mcp'), { recursive: true })
writeFileSync(OUT_FILE, JSON.stringify({ routes }, null, 2) + '\n')
const withBody = routes.filter((r) => Object.values(r.handlers).some((h) => h.body?.length)).length
console.log(`Wrote ${routes.length} routes to ${relative(process.cwd(), OUT_FILE)} (${withBody} with body-field hints)`)
