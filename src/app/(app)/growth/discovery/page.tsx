import { DiscoverySearch } from '@/components/growth/discovery-search'

export default function DiscoveryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Discovery</h1>
        <p className="text-muted-foreground mt-1">
          Find new prospects using AI-powered search
        </p>
      </div>

      <DiscoverySearch />
    </div>
  )
}

