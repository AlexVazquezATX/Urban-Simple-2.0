import { Badge } from '@/components/ui/badge'
import { managerStrings, type ManagerLang } from '@/lib/i18n/manager'

// Shared status/severity chips for the staff issue surface. Kept in one place so
// the list and detail views read identically. Tones follow the house palette:
// coral = needs attention, gold = in flight, green = done, neutral = closed.
// Labels follow the viewer's language when `lang` is passed (English otherwise).

type BadgeTone = 'neutral' | 'gold' | 'teal' | 'coral' | 'green'

const STATUS_TONE: Record<string, BadgeTone> = {
  open: 'coral',
  in_progress: 'gold',
  resolved: 'green',
  closed: 'neutral',
}

const SEVERITY_TONE: Record<string, BadgeTone> = {
  low: 'neutral',
  medium: 'teal',
  high: 'gold',
  critical: 'coral',
}

const TYPE_TONE: Record<string, BadgeTone> = {
  issue: 'neutral',
  incomplete_work: 'gold',
  request: 'teal',
}

const SOURCE_TONE: Record<string, BadgeTone> = {
  client: 'coral',
  associate: 'neutral',
  manager_review: 'neutral',
  staff: 'neutral',
}

export function IssueStatusBadge({ status, lang = 'en' }: { status: string; lang?: ManagerLang }) {
  return <Badge variant={STATUS_TONE[status] ?? 'neutral'}>{issueStatusLabel(status, lang)}</Badge>
}

export function IssueSeverityBadge({ severity, lang = 'en' }: { severity: string; lang?: ManagerLang }) {
  return (
    <Badge variant={SEVERITY_TONE[severity] ?? 'neutral'}>
      {managerStrings(lang).severity[severity] ?? severity}
    </Badge>
  )
}

export function issueStatusLabel(status: string, lang: ManagerLang = 'en') {
  return managerStrings(lang).issueStatus[status] ?? status
}

export function IssueTypeBadge({ type, lang = 'en' }: { type: string; lang?: ManagerLang }) {
  const key = TYPE_TONE[type] ? type : 'issue'
  return <Badge variant={TYPE_TONE[key]}>{managerStrings(lang).issueType[key]}</Badge>
}

export function IssueSourceBadge({ source, lang = 'en' }: { source: string; lang?: ManagerLang }) {
  return (
    <Badge variant={SOURCE_TONE[source] ?? 'neutral'}>
      {managerStrings(lang).issueSource[source] ?? source}
    </Badge>
  )
}
