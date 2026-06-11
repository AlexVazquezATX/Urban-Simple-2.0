import { PageHeader } from '@/components/layout/page-header'
import { DiscoverySearch } from '@/components/growth/discovery-search'

export default function DiscoveryPage() {
  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-background p-4 md:p-6">
      <PageHeader
        kicker="GROWTH · AI DISCOVERY"
        title="AI Discovery"
        subtitle="Find new prospects using AI-powered search"
      />

      <DiscoverySearch />
    </div>
  )
}
