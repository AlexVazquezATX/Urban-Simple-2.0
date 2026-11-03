import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { smsConfigured } from '@/lib/notify/sms'
import { MyAlertsForm } from '@/components/team/my-alerts-form'

export const dynamic = 'force-dynamic'

export default async function MyAlertsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const prefs = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phone: true, smsAlerts: true },
  })

  return (
    <MyAlertsForm
      initialPhone={prefs?.phone ?? null}
      initialSmsAlerts={prefs?.smsAlerts ?? false}
      smsAvailable={smsConfigured()}
    />
  )
}
