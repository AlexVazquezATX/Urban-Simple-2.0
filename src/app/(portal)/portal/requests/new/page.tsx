import { MapPin } from 'lucide-react'
import { requirePortalContext } from '@/lib/portal-auth'
import { clientTimezone, localDateKey } from '@/lib/portal-dates'
import { RequestForm } from '@/components/portal/request-form'
import { LiveEmpty, LivePage, LivePageHead } from '@/components/portal/live-shell'

export default async function NewRequestPage() {
  const ctx = await requirePortalContext()
  const today = localDateKey(new Date(), await clientTimezone(ctx.client.id))

  return (
    <LivePage>
      <LivePageHead
        kicker="Ask for what you need"
        title="New request"
        sub="Extra cleaning, supplies, a schedule change or event prep. Your account manager gets it right away."
      />
      {ctx.client.isSelfServe ? (
        <LiveEmpty
          icon={<MapPin className="h-4.5 w-4.5" />}
          title="Requests are for Urban Simple cleaning clients"
          sub="Want us cleaning your kitchen? Email hello@urbansimple.net and we'll set up a walkthrough."
        />
      ) : ctx.locations.length === 0 ? (
        <LiveEmpty
          icon={<MapPin className="h-4.5 w-4.5" />}
          title="No active locations on your account"
          sub="Email hello@urbansimple.net and we'll take care of your request."
        />
      ) : (
        <RequestForm
          locations={ctx.locations.map(l => ({ id: l.id, name: l.name }))}
          minDate={today}
        />
      )}
    </LivePage>
  )
}
