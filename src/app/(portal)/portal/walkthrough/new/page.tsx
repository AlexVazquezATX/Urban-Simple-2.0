import { format } from 'date-fns'
import { requirePortalContext } from '@/lib/portal-auth'
import { WalkthroughCapture } from '@/components/portal/walkthrough-capture'
import { DEFAULT_WALKTHROUGH_ZONES } from '@/lib/portal-walkthrough'
import { LivePage } from '@/components/portal/live-shell'

// Walkthrough capture — LiveWalkthrough spec (usp-live-pages.jsx): zone list
// left, capture panel right, live progress bar in the page head. The kicker
// date is formatted server-side to keep hydration stable.

export default async function NewWalkthroughPage() {
  const ctx = await requirePortalContext()
  return (
    <LivePage wide>
      <WalkthroughCapture
        kicker={format(new Date(), 'EEEE · MMMM d')}
        locations={ctx.locations.map(l => ({ id: l.id, name: l.name }))}
        defaultZones={[...DEFAULT_WALKTHROUGH_ZONES]}
      />
    </LivePage>
  )
}
