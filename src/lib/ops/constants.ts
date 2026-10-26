// Shared (client + server) vocab for the ops loop. Bilingual where associates
// see it. Keep ids stable: they are stored in the database.

export const NOT_DONE_REASONS = [
  { id: 'out_of_time', en: 'Ran out of time', es: 'Se acabó el tiempo' },
  { id: 'no_access', en: 'No access / area locked', es: 'Sin acceso / área cerrada' },
  { id: 'area_in_use', en: 'Area in use (staff still working)', es: 'Área en uso (personal trabajando)' },
  { id: 'equipment_broken', en: 'Equipment broken or missing', es: 'Equipo dañado o faltante' },
  { id: 'out_of_supplies', en: 'Out of supplies', es: 'Sin suministros' },
  { id: 'safety', en: 'Safety concern', es: 'Problema de seguridad' },
  { id: 'other', en: 'Other (explain below)', es: 'Otro (explique abajo)' },
] as const

export type NotDoneReasonId = (typeof NOT_DONE_REASONS)[number]['id']

export function reasonLabel(id: string | null | undefined, lang: 'en' | 'es' = 'en'): string {
  const r = NOT_DONE_REASONS.find(x => x.id === id)
  return r ? r[lang] : id || ''
}

export const ISSUE_CATEGORIES = [
  { id: 'quality', label: 'Cleaning quality' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'supplies', label: 'Supplies' },
  { id: 'access', label: 'Access / keys' },
  { id: 'safety', label: 'Safety' },
  { id: 'communication', label: 'Communication' },
  { id: 'other', label: 'Other' },
] as const

export const REQUEST_KINDS = [
  { id: 'extra_cleaning', label: 'Extra or deep cleaning' },
  { id: 'supplies', label: 'Supplies or restock' },
  { id: 'schedule_change', label: 'Schedule change / skip a night' },
  { id: 'special_event', label: 'Special event prep' },
  { id: 'other', label: 'Something else' },
] as const

export const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
export const ISSUE_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const

export function categoryLabel(id: string, type?: string): string {
  const list = type === 'request' ? REQUEST_KINDS : ISSUE_CATEGORIES
  return (list as ReadonlyArray<{ id: string; label: string }>).find(c => c.id === id)?.label
    ?? id.replace(/_/g, ' ')
}

export function issueTypeLabel(type: string): string {
  if (type === 'incomplete_work') return 'Unfinished work'
  if (type === 'request') return 'Service request'
  return 'Issue'
}

export function statusLabel(status: string): string {
  return status === 'in_progress' ? 'In progress' : status.charAt(0).toUpperCase() + status.slice(1)
}

export interface IncompleteItem {
  itemId: string
  text: string
  section?: string
  reason: string // NotDoneReasonId
  note?: string
  photos?: string[]
}
