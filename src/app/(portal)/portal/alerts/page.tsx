import { BellOff } from 'lucide-react'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import { smsConfigured } from '@/lib/notify/sms'
import { AlertsForm } from '@/components/portal/alerts-form'
import { LiveEmpty, LivePage, LivePageHead } from '@/components/portal/live-shell'

// Alert preferences for the signed-in user's own ClientContact row.
export default async function PortalAlertsPage() {
  const ctx = await requirePortalContext()

  const contact = await prisma.clientContact.findFirst({
    where: { userId: ctx.userId, clientId: ctx.client.id },
    orderBy: { createdAt: 'asc' },
    select: {
      email: true,
      phone: true,
      alertEmail: true,
      alertSms: true,
      locationIds: true,
      smsConsentAt: true,
      smsOptedOutAt: true,
    },
  })

  return (
    <LivePage>
      <LivePageHead
        kicker="Stay in the loop"
        title="Alerts"
        sub="Choose how you hear from us when something needs your attention, like unfinished work after a visit or an update on an issue."
      />

      {!contact ? (
        <LiveEmpty
          icon={<BellOff className="h-4.5 w-4.5" />}
          title={ctx.impersonating ? 'Alerts are set per person' : "We couldn't find your contact details"}
          sub={
            ctx.impersonating
              ? 'Alert settings belong to each client contact, so there is nothing to show while viewing as the client.'
              : "Email hello@urbansimple.net and we'll link your login so you can manage alerts."
          }
        />
      ) : (
        <AlertsForm
          contact={{
            ...contact,
            smsConsentAt: contact.smsConsentAt?.toISOString() ?? null,
            smsOptedOutAt: contact.smsOptedOutAt?.toISOString() ?? null,
          }}
          locations={ctx.locations}
          smsAvailable={smsConfigured()}
        />
      )}
    </LivePage>
  )
}
