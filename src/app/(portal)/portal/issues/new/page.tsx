import { requirePortalContext } from '@/lib/portal-auth'
import { ReportIssueForm } from '@/components/portal/report-issue-form'
import { LivePage, LivePageHead } from '@/components/portal/live-shell'

export default async function NewIssuePage() {
  const ctx = await requirePortalContext()
  return (
    <LivePage>
      <LivePageHead
        kicker="Flag it — we'll handle it"
        title="Report something"
        sub="Tell us what's going on. Your account manager gets notified immediately."
      />
      <ReportIssueForm
        locations={ctx.locations.map(l => ({ id: l.id, name: l.name }))}
      />
    </LivePage>
  )
}
