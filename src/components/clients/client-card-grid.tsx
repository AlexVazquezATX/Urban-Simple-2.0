import { Building2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { ClientCard } from './client-card'

interface ClientCardGridProps {
  clients: any[]
  showFinancials?: boolean
  onView?: (client: any) => void
}

export function ClientCardGrid({ clients, showFinancials = false, onView }: ClientCardGridProps) {
  if (clients.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No clients found"
        description="Try a different search or clear your filters."
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {clients.map((client) => (
        <ClientCard
          key={client.id}
          client={client}
          showFinancials={showFinancials}
          onView={onView}
        />
      ))}
    </div>
  )
}
