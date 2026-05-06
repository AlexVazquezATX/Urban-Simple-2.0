import { requirePortalContext } from '@/lib/portal-auth'
import { WalkthroughCapture } from '@/components/portal/walkthrough-capture'
import { DEFAULT_WALKTHROUGH_ZONES } from '@/lib/portal-walkthrough'

export default async function NewWalkthroughPage() {
  const ctx = await requirePortalContext()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-display font-medium text-warm-900">Morning Walkthrough</h1>
        <p className="mt-1 text-sm text-warm-500">
          Quick photo + note capture by zone. ~60 seconds. Builds your inspection trail.
        </p>
      </div>
      <WalkthroughCapture
        locations={ctx.locations.map(l => ({ id: l.id, name: l.name }))}
        defaultZones={[...DEFAULT_WALKTHROUGH_ZONES]}
      />
    </div>
  )
}
