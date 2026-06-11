import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Mail, Phone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMargin } from '@/lib/financials'
import { formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ClientActionsMenu } from './client-actions-menu'
import { marginToneClass } from './margin-tone'

interface ClientCardProps {
  client: any
  showFinancials?: boolean
  // When provided, the name + "View Details" open the quick-view panel
  // instead of navigating to the full page.
  onView?: (client: any) => void
}

export function ClientCard({ client, showFinancials = false, onView }: ClientCardProps) {
  const address = client.address as any
  const addressStr = address
    ? `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.zip || ''}`.trim()
    : null
  const isChild = client._isChild === true
  const childLocationCount = client._childLocationCount ?? 0

  return (
    <Card
      className={cn(
        'flex h-full flex-col gap-0 p-0 py-0 transition-colors hover:border-primary/40',
        isChild && 'border-l-2 border-l-primary/40'
      )}
    >
      <CardContent className="flex flex-1 flex-col p-4">
        {/* Header: compact logo/initial + name + status */}
        <div className="flex items-start gap-2.5">
          {client.logoUrl ? (
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[10px] bg-secondary">
              <Image src={client.logoUrl} alt={client.name} fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-secondary">
              <span className="text-sm font-medium text-muted-foreground">
                {client.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            {onView ? (
              <button
                type="button"
                onClick={() => onView(client)}
                className="block max-w-full text-left"
              >
                <h3 className="truncate font-display text-base font-bold leading-tight tracking-[-0.2px] text-foreground transition-colors hover:text-primary">
                  {client.name}
                </h3>
              </button>
            ) : (
              <Link href={`/clients/${client.id}`}>
                <h3 className="truncate font-display text-base font-bold leading-tight tracking-[-0.2px] text-foreground transition-colors hover:text-primary">
                  {client.name}
                </h3>
              </Link>
            )}
            {client.legalName && (
              <p className="truncate text-xs text-muted-foreground">{client.legalName}</p>
            )}
          </div>
          <Badge
            variant={client.status === 'active' ? 'green' : 'neutral'}
            className="shrink-0"
          >
            {client.status}
          </Badge>
        </div>

        {/* Contact details */}
        {(addressStr || client.billingEmail || client.phone) && (
          <div className="mt-2.5 space-y-1 text-xs">
            {addressStr && (
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
                <span className="line-clamp-1">{addressStr}</span>
              </div>
            )}
            {client.billingEmail && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{client.billingEmail}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <span>{client.phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Chips row */}
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Badge variant="neutral">{client.branch.code}</Badge>
          <Badge variant="neutral">{client.paymentTerms}</Badge>
          {client.locations.length > 0 && (
            <Badge variant="teal">
              {client.locations.length} {client.locations.length === 1 ? 'location' : 'locations'}
            </Badge>
          )}
          {childLocationCount > 0 && (
            <Badge variant="neutral">+{childLocationCount} in group</Badge>
          )}
          {client.parentClient && (
            <Link href={`/clients/${client.parentClient.id}`}>
              <Badge variant="neutral" className="hover:bg-secondary/70">
                ↑ {client.parentClient.name}
              </Badge>
            </Link>
          )}
          {client._count?.childClients > 0 && (
            <Badge variant="neutral">
              {client._count.childClients}{' '}
              {client._count.childClients === 1 ? 'child' : 'children'}
            </Badge>
          )}
        </div>

        {/* Mini financial table */}
        {showFinancials && client.financials && client.financials.agreementCount > 0 && (
          <div className="mt-2.5 grid grid-cols-3 gap-1.5 rounded-[10px] border border-border bg-secondary/40 p-2.5">
            <div>
              <p className="kicker text-muted-foreground">MRR</p>
              <p className="mt-0.5 font-mono text-xs font-medium tabular-nums text-foreground">
                {formatMoney(client.financials.monthlyRevenue)}
              </p>
            </div>
            <div>
              <p className="kicker text-muted-foreground">Profit</p>
              <p
                className={`mt-0.5 font-mono text-xs font-medium tabular-nums ${marginToneClass(client.financials.marginPct)}`}
              >
                {formatMoney(client.financials.monthlyProfit)}
              </p>
            </div>
            <div>
              <p className="kicker text-muted-foreground">Margin</p>
              <p
                className={`mt-0.5 font-mono text-xs font-medium tabular-nums ${marginToneClass(client.financials.marginPct)}`}
              >
                {formatMargin(client.financials.marginPct)}
              </p>
            </div>
          </div>
        )}

        {/* Spacer pushes the action row to the bottom */}
        <div className="min-h-2 flex-1" />

        <div className="mt-2.5 flex items-center gap-1.5 border-t border-border pt-2.5">
          {onView ? (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1"
              onClick={() => onView(client)}
            >
              View Details
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm" className="flex-1">
              <Link href={`/clients/${client.id}`}>View Details</Link>
            </Button>
          )}
          <ClientActionsMenu
            endpoint={`/api/clients/${client.id}`}
            entityLabel={client.name}
            entityKind="client"
          />
        </div>
      </CardContent>
    </Card>
  )
}
