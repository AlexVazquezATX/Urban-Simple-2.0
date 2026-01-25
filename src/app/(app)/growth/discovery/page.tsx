import { DiscoverySearch } from '@/components/growth/discovery-search'

export default function DiscoveryPage() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-warm-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-medium tracking-tight text-warm-900">AI Discovery</h1>
          <p className="text-sm text-warm-500 mt-0.5">
            Find new prospects using AI-powered search
          </p>
        </div>
      </div>

      <DiscoverySearch />
    </div>
  )
}
