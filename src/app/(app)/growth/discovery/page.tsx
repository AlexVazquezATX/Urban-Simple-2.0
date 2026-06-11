import { PageHeader } from '@/components/layout/page-header'
import { DiscoverySearch } from '@/components/growth/discovery-search'

export default function DiscoveryPage() {
  return (
    <div>
      <PageHeader
        kicker="GROWTH · AI DISCOVERY"
        title="AI Discovery"
        subtitle="Find new prospects using AI-powered search"
      />

      <DiscoverySearch />
    </div>
  )
}
