// Generate the API endpoint catalog served by the MCP server's
// `list_endpoints` tool (src/app/api/mcp/route.ts).
//
// Scans src/app/api/**/route.ts, extracts the exported HTTP methods, and
// writes src/lib/mcp/api-catalog.json (committed — regenerate when routes
// change):
//
//   npm run generate-api-catalog
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, relative, sep } from 'path'

const API_DIR = join(process.cwd(), 'src', 'app', 'api')
const OUT_FILE = join(process.cwd(), 'src', 'lib', 'mcp', 'api-catalog.json')

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] as const

function findRouteFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...findRouteFiles(full))
    else if (entry.name === 'route.ts' || entry.name === 'route.tsx') out.push(full)
  }
  return out
}

function extractMethods(source: string): string[] {
  const found = new Set<string>()
  // export async function GET(  |  export function GET(
  for (const m of source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD)\b/g)) {
    found.add(m[1])
  }
  // export const GET = ...  |  export { GET, POST }
  for (const m of source.matchAll(/export\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD)\s*=/g)) {
    found.add(m[1])
  }
  for (const m of source.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const name of m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()?.trim())) {
      if (name && (HTTP_METHODS as readonly string[]).includes(name)) found.add(name)
    }
  }
  return HTTP_METHODS.filter((m) => found.has(m))
}

function routePath(file: string): string {
  // src/app/api/clients/[id]/route.ts → /api/clients/[id]
  const rel = relative(join(process.cwd(), 'src', 'app'), file)
  const noFile = rel.split(sep).slice(0, -1).join('/')
  // Route groups like (app) never appear under /api here, but strip defensively.
  const cleaned = noFile
    .split('/')
    .filter((seg) => !(seg.startsWith('(') && seg.endsWith(')')))
    .join('/')
  return '/' + cleaned
}

const routes = findRouteFiles(API_DIR)
  .map((file) => ({
    path: routePath(file),
    methods: extractMethods(readFileSync(file, 'utf8')),
  }))
  .filter((r) => r.methods.length > 0)
  .sort((a, b) => a.path.localeCompare(b.path))

mkdirSync(join(process.cwd(), 'src', 'lib', 'mcp'), { recursive: true })
writeFileSync(OUT_FILE, JSON.stringify({ routes }, null, 2) + '\n')
console.log(`Wrote ${routes.length} routes to ${relative(process.cwd(), OUT_FILE)}`)
