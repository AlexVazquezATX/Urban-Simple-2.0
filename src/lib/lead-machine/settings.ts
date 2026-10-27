// Per-company lead machine settings. No row means the machine is off; a new
// row starts in dry-run so the first nights only report what they would do.

import { prisma } from '@/lib/db'

export type SourceKey = 'tabc' | 'alcohol_sales' | 'places_hotels'

export const SOURCE_LABELS: Record<SourceKey, string> = {
  tabc: 'New liquor license filings (TABC)',
  alcohol_sales: 'Texas alcohol sales (monthly)',
  places_hotels: 'Google hotels and resorts',
}

export const DEFAULT_SOURCE_CAPS: Record<SourceKey, number> = {
  tabc: 8,
  alcohol_sales: 10,
  places_hotels: 7,
}

export type MachineSettings = {
  companyId: string
  enabled: boolean
  dryRun: boolean
  dailyNewCap: number
  sourceCaps: Record<SourceKey, number>
  placesMonthlyCallCap: number
  briefEnabled: boolean
  notifyEmail: string | null
  exists: boolean
}

function parseCaps(raw: unknown): Record<SourceKey, number> {
  const caps = { ...DEFAULT_SOURCE_CAPS }
  if (raw && typeof raw === 'object') {
    for (const key of Object.keys(DEFAULT_SOURCE_CAPS) as SourceKey[]) {
      const v = (raw as Record<string, unknown>)[key]
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) caps[key] = Math.floor(v)
    }
  }
  return caps
}

export async function getSettings(companyId: string): Promise<MachineSettings> {
  const row = await prisma.leadMachineSettings.findUnique({ where: { companyId } })
  return {
    companyId,
    enabled: row?.enabled ?? false,
    dryRun: row?.dryRun ?? true,
    dailyNewCap: row?.dailyNewCap ?? 25,
    sourceCaps: parseCaps(row?.sourceCaps),
    placesMonthlyCallCap: row?.placesMonthlyCallCap ?? 300,
    briefEnabled: row?.briefEnabled ?? true,
    notifyEmail: row?.notifyEmail ?? null,
    exists: !!row,
  }
}

export type SettingsPatch = Partial<Omit<MachineSettings, 'companyId' | 'exists'>>

/** Validate a settings patch from the API. Returns an error message or the clean patch. */
export function validatePatch(body: unknown): { error: string } | { patch: SettingsPatch } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Body must be a JSON object' }
  const b = body as Record<string, unknown>
  const patch: SettingsPatch = {}
  for (const key of ['enabled', 'dryRun', 'briefEnabled'] as const) {
    if (b[key] !== undefined) {
      if (typeof b[key] !== 'boolean') return { error: `${key} must be true or false` }
      patch[key] = b[key] as boolean
    }
  }
  if (b.dailyNewCap !== undefined) {
    const n = b.dailyNewCap
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 200) return { error: 'dailyNewCap must be a whole number from 0 to 200' }
    patch.dailyNewCap = n
  }
  if (b.placesMonthlyCallCap !== undefined) {
    const n = b.placesMonthlyCallCap
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 5000) return { error: 'placesMonthlyCallCap must be a whole number from 0 to 5000' }
    patch.placesMonthlyCallCap = n
  }
  if (b.sourceCaps !== undefined) {
    if (!b.sourceCaps || typeof b.sourceCaps !== 'object') return { error: 'sourceCaps must be an object' }
    for (const [k, v] of Object.entries(b.sourceCaps as Record<string, unknown>)) {
      if (!(k in DEFAULT_SOURCE_CAPS)) return { error: `Unknown source "${k}"` }
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 200) return { error: `sourceCaps.${k} must be a whole number from 0 to 200` }
    }
    patch.sourceCaps = parseCaps(b.sourceCaps)
  }
  if (b.notifyEmail !== undefined) {
    if (b.notifyEmail !== null && (typeof b.notifyEmail !== 'string' || !b.notifyEmail.includes('@'))) {
      return { error: 'notifyEmail must be an email address or null' }
    }
    patch.notifyEmail = (b.notifyEmail as string | null)?.trim() || null
  }
  if (Object.keys(patch).length === 0) return { error: 'Nothing to update' }
  return { patch }
}

export async function updateSettings(companyId: string, patch: SettingsPatch): Promise<MachineSettings> {
  const data = {
    ...patch,
    ...(patch.sourceCaps ? { sourceCaps: patch.sourceCaps } : {}),
  }
  await prisma.leadMachineSettings.upsert({
    where: { companyId },
    create: { companyId, ...data },
    update: data,
  })
  return getSettings(companyId)
}
