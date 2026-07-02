import { PageHeader } from '@/components/layout/page-header'
import { IssuesList } from '@/components/issues/issues-list'
import { getCurrentUser } from '@/lib/auth'

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE']

export default async function IssuesPage() {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  if (!STAFF_ROLES.includes(user.role)) {
    return <div>Access denied</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="OPERATIONS · ISSUES"
        title="Issues"
        subtitle="Client-reported issues across your accounts. Triage them, work them, and close them out."
      />
      <IssuesList />
    </div>
  )
}
