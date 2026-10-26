import { MapPin } from 'lucide-react'
import { requirePortalContext } from '@/lib/portal-auth'
import { ReportIssueForm } from '@/components/portal/report-issue-form'
import { LiveEmpty, LivePage, LivePageHead } from '@/components/portal/live-shell'

export default async function NewIssuePage() {
  const ctx = await requirePortalContext()
  return (
    <LivePage>
      <LivePageHead
        kicker="Flag it. We'll handle it."
        title="Report something"
        sub="Tell us what's going on. Your account manager is notified right away."
      />
      {ctx.locations.length === 0 ? (
        <LiveEmpty
          icon={<MapPin className="h-4.5 w-4.5" />}
          title="No active locations on your account"
          sub="Email hello@urbansimple.net and we'll look into it."
        />
      ) : (
        <ReportIssueForm locations={ctx.locations.map(l => ({ id: l.id, name: l.name }))} />
      )}
    </LivePage>
  )
}
