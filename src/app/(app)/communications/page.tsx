import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { CommunicationsClient } from './communications-client'

export const dynamic = 'force-dynamic'

// Comms Hub — every email in or out of the business, one screen.
// Attention lane = inbound waiting on a human; All = the full firehose.
export default async function CommunicationsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) redirect('/dashboard')

  return <CommunicationsClient />
}
