// Gives crew members a login with a random 6-digit PIN and writes a printable
// sheet (one cut-out slip per person, Spanish first) for their manager.
//
//   npm run crew:logins -- dalia.torres@urbansimple.net frank.segovia@urbansimple.net
//       dry run: shows who would get a login, changes nothing
//   npm run crew:logins -- --go <emails...>
//       creates the logins and writes the sheet
//   npm run crew:logins -- --go --reset <emails...>
//       also sets a new PIN for anyone who already has a login (forgot it)
//   --out <file.html>   where to write the sheet (default: crew-pins-<date>.html)
//
// PINs are only written to the sheet, never printed to the terminal. Only
// active ASSOCIATE accounts are touched.
import { config } from 'dotenv'
import { resolve } from 'path'
import { writeFileSync } from 'fs'
import { randomInt } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const LOGIN_URL = 'https://www.urbansimple.net/login'

const args = process.argv.slice(2)
const go = args.includes('--go')
const reset = args.includes('--reset')
const outIdx = args.indexOf('--out')
const out = outIdx >= 0 ? args[outIdx + 1] : `crew-pins-${new Date().toISOString().slice(0, 10)}.html`
const emails = args
  .filter((a, i) => !a.startsWith('--') && !(outIdx >= 0 && i === outIdx + 1))
  .flatMap(a => a.split(','))
  .map(e => e.trim().toLowerCase())
  .filter(Boolean)

if (emails.length === 0) {
  console.error('Give at least one crew email. See the top of scripts/crew-logins.ts.')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const prisma = new PrismaClient()

// Six digits, no repeated runs like 111111 and no straight sequences like 123456.
function newPin(): string {
  for (;;) {
    const pin = String(randomInt(100000, 1000000))
    const d = pin.split('').map(Number)
    const same = d.every(x => x === d[0])
    const up = d.every((x, i) => i === 0 || x === d[i - 1] + 1)
    const down = d.every((x, i) => i === 0 || x === d[i - 1] - 1)
    if (!same && !up && !down) return pin
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
}

type Slip = { name: string; email: string; pin: string }

function sheet(slips: Slip[]): string {
  const cards = slips
    .map(
      s => `<div class="slip">
  <div class="name">${esc(s.name)}</div>
  <div class="row"><span>Entrar en / Sign in at</span><b>${LOGIN_URL.replace('https://', '')}</b></div>
  <div class="row"><span>Correo / Email</span><b>${esc(s.email)}</b></div>
  <div class="row"><span>Clave / PIN</span><b class="pin">${s.pin}</b></div>
  <div class="note">Guarda esta clave. Después de entrar, el teléfono te mantiene conectado.<br>
  <i>Keep this PIN. After signing in, the phone keeps you signed in.</i></div>
</div>`
    )
    .join('\n')
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Claves del equipo</title>
<style>
  body { font-family: Arial, sans-serif; margin: 24px; color: #1a1a1a; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p.sub { margin: 0 0 18px; color: #555; font-size: 13px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .slip { border: 1px dashed #888; border-radius: 8px; padding: 14px; break-inside: avoid; }
  .name { font-size: 17px; font-weight: bold; margin-bottom: 8px; }
  .row { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; padding: 3px 0; }
  .row span { color: #555; }
  .pin { font-size: 20px; letter-spacing: 3px; }
  .note { margin-top: 8px; font-size: 11px; color: #555; }
</style></head><body>
<h1>Claves del equipo / Crew sign-in PINs</h1>
<p class="sub">Recorta y entrega cada tarjeta en persona. / Cut out and hand each slip over in person.</p>
<div class="grid">
${cards}
</div>
</body></html>
`
}

async function main() {
  console.log(go ? 'Creating logins...' : 'Dry run (add --go to create the logins):')
  const slips: Slip[] = []
  let problems = 0

  for (const email of emails) {
    const u = await prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, authId: true },
    })
    const label = u ? `${u.firstName} ${u.lastName} <${email}>` : email
    if (!u) { console.log(`  SKIP ${label}: no account with that email`); problems++; continue }
    if (!u.isActive) { console.log(`  SKIP ${label}: account is deactivated`); problems++; continue }
    if (u.role !== 'ASSOCIATE') { console.log(`  SKIP ${label}: role is ${u.role}, not ASSOCIATE`); problems++; continue }
    if (u.authId && !reset) { console.log(`  SKIP ${label}: already has a login (add --reset to give a new PIN)`); continue }

    const action = u.authId ? 'new PIN' : 'new login'
    if (!go) { console.log(`  would give ${label} a ${action}`); continue }

    const pin = newPin()
    if (u.authId) {
      const { error } = await supabase.auth.admin.updateUserById(u.authId, { password: pin })
      if (error) { console.log(`  FAIL ${label}: ${error.message}`); problems++; continue }
    } else {
      const { data, error } = await supabase.auth.admin.createUser({ email: u.email, password: pin, email_confirm: true })
      if (error || !data.user) { console.log(`  FAIL ${label}: ${error?.message ?? 'no user returned'}`); problems++; continue }
      await prisma.user.update({ where: { id: u.id }, data: { authId: data.user.id } })
    }
    slips.push({ name: `${u.firstName} ${u.lastName}`, email: u.email, pin })
    console.log(`  OK   ${label}: ${action}`)
  }

  if (go && slips.length > 0) {
    writeFileSync(out, sheet(slips), 'utf8')
    console.log(`\nSheet with ${slips.length} PIN(s): ${resolve(out)}`)
    console.log('Open it in a browser and print, or send it to the manager. Do not commit it.')
  }
  if (problems > 0) process.exitCode = 1
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
