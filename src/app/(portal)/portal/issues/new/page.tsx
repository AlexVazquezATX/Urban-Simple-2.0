import { requirePortalContext } from '@/lib/portal-auth'
import { ReportIssueForm } from '@/components/portal/report-issue-form'

export default async function NewIssuePage() {
  const ctx = await requirePortalContext()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-display font-medium text-warm-900">Report an issue</h1>
        <p className="mt-1 text-sm text-warm-500">
          Tell us what&apos;s going on. Your account manager gets notified immediately.
        </p>
      </div>
      <ReportIssueForm
        locations={ctx.locations.map(l => ({ id: l.id, name: l.name }))}
      />
    </div>
  )
}
