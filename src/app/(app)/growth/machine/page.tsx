import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { PageHeader } from '@/components/layout/page-header'
import { LeadMachineClient } from '@/components/growth/lead-machine-client'

export default async function LeadMachinePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') redirect('/growth')

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="GROWTH · LEAD MACHINE"
        title="Lead Machine"
        subtitle="Finds new accounts every night from public data and Google, and reports each morning."
      />
      <LeadMachineClient />
    </div>
  )
}
