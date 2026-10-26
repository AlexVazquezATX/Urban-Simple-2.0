import { IssuesList } from '@/components/issues/issues-list'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE']

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; status?: string; locationId?: string; clientId?: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  if (!STAFF_ROLES.includes(user.role)) {
    return <div>Access denied</div>
  }

  const sp = await searchParams

  // Location picker for "New issue".
  const locations = await prisma.location.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      client: { companyId: user.companyId, deletedAt: null },
    },
    select: { id: true, name: true, client: { select: { id: true, name: true } } },
    orderBy: [{ client: { name: 'asc' } }, { name: 'asc' }],
  })

  return (
    <div className="space-y-6">
      <IssuesList
        locations={locations}
        initialView={sp.view}
        initialStatus={sp.status}
        initialLocationId={sp.locationId}
        initialClientId={sp.clientId}
      />
    </div>
  )
}
