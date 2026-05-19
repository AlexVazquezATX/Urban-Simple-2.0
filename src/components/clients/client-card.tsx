import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Mail, Phone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClientForm } from '@/components/forms/client-form'
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button'
import { formatCurrency, formatMargin, marginToneClass } from '@/lib/financials'
import { cn } from '@/lib/utils'

interface ClientCardProps {
  client: any
  showFinancials?: boolean
}

export function ClientCard({ client, showFinancials = false }: ClientCardProps) {
  const address = client.address as any
  const addressStr = address
    ? `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.zip || ''}`.trim()
    : null
  const isChild = client._isChild === true
  const childLocationCount = client._childLocationCount ?? 0

  return (
    <Card
      className={cn(
        'flex h-full flex-col rounded-sm border-warm-200 p-0 transition-colors hover:border-ocean-300 dark:border-charcoal-700',
        isChild && 'border-l-2 border-l-plum-300 dark:border-l-plum-700'
      )}
    >
      <CardContent className="flex flex-1 flex-col p-3">
        {/* Header: compact logo/initial + name + status */}
        <div className="flex items-start gap-2.5">
          {client.logoUrl ? (
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-sm bg-warm-100 dark:bg-charcoal-800">
              <Image src={client.logoUrl} alt={client.name} fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-warm-100 dark:bg-charcoal-800">
              <span className="text-sm font-medium text-warm-500 dark:text-cream-400">
                {client.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link href={`/clients/${client.id}`}>
              <h3 className="truncate text-base font-display font-medium leading-tight text-warm-900 transition-colors hover:text-ocean-600 dark:text-cream-100">
                {client.name}
              </h3>
            </Link>
            {client.legalName && (
              <p className="truncate text-xs text-warm-500 dark:text-cream-400">{client.legalName}</p>
            )}
          </div>
          <Badge
            className={cn(
              'shrink-0 rounded-sm px-1.5 py-0 text-[10px]',
              client.status === 'active'
                ? 'border-lime-200 bg-lime-100 text-lime-700'
                : 'border-warm-200 bg-warm-100 text-warm-600'
            )}
          >
            {client.status}
          </Badge>
        </div>

        {/* Contact details */}
        {(addressStr || client.billingEmail || client.phone) && (
          <div className="mt-2.5 space-y-1 text-xs">
            {addressStr && (
              <div className="flex items-start gap-1.5 text-warm-500 dark:text-cream-400">
                <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
                <span className="line-clamp-1">{addressStr}</span>
              </div>
            )}
            {client.billingEmail && (
              <div className="flex items-center gap-1.5 text-warm-500 dark:text-cream-400">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{client.billingEmail}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-1.5 text-warm-500 dark:text-cream-400">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <span>{client.phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Badges */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="rounded-sm border-warm-300 px-1 py-0 text-[9px] text-warm-600 dark:border-charcoal-700 dark:text-cream-400">
            {client.branch.code}
          </Badge>
          <Badge variant="outline" className="rounded-sm border-warm-300 px-1 py-0 text-[9px] text-warm-600 dark:border-charcoal-700 dark:text-cream-400">
            {client.paymentTerms}
          </Badge>
          {client.locations.length > 0 && (
            <Badge className="rounded-sm border-ocean-200 bg-ocean-100 px-1 py-0 text-[9px] text-ocean-700">
              {client.locations.length} {client.locations.length === 1 ? 'location' : 'locations'}
            </Badge>
          )}
          {childLocationCount > 0 && (
            <Badge className="rounded-sm border-plum-200 bg-plum-100 px-1 py-0 text-[9px] text-plum-700">
              +{childLocationCount} in group
            </Badge>
          )}
          {client.parentClient && (
            <Link href={`/clients/${client.parentClient.id}`}>
              <Badge variant="outline" className="rounded-sm border-plum-200 px-1 py-0 text-[9px] text-plum-600">
                ↑ {client.parentClient.name}
              </Badge>
            </Link>
          )}
          {client._count?.childClients > 0 && (
            <Badge className="rounded-sm border-plum-200 bg-plum-100 px-1 py-0 text-[9px] text-plum-700">
              {client._count.childClients} {client._count.childClients === 1 ? 'child' : 'children'}
            </Badge>
          )}
        </div>

        {showFinancials && client.financials && client.financials.agreementCount > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-sm border border-warm-200 bg-warm-50/50 p-2 text-[10px] dark:border-charcoal-700 dark:bg-charcoal-900/40">
            <div>
              <p className="uppercase tracking-wider text-warm-500 dark:text-cream-400">MRR</p>
              <p className="font-mono font-medium text-warm-900 dark:text-cream-100">
                {formatCurrency(client.financials.monthlyRevenue)}
              </p>
            </div>
            <div>
              <p className="uppercase tracking-wider text-warm-500 dark:text-cream-400">Profit</p>
              <p className={`font-mono font-medium ${marginToneClass(client.financials.marginPct)}`}>
                {formatCurrency(client.financials.monthlyProfit)}
              </p>
            </div>
            <div>
              <p className="uppercase tracking-wider text-warm-500 dark:text-cream-400">Margin</p>
              <p className={`font-mono font-medium ${marginToneClass(client.financials.marginPct)}`}>
                {formatMargin(client.financials.marginPct)}
              </p>
            </div>
          </div>
        )}

        {/* Spacer pushes the action row to the bottom */}
        <div className="min-h-2 flex-1" />

        <div className="mt-2 flex items-center gap-1.5 border-t border-warm-200 pt-2 dark:border-charcoal-700">
          <Link href={`/clients/${client.id}`} className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-full rounded-sm border-ocean-400 text-xs text-ocean-600 hover:border-ocean-500 hover:bg-ocean-50 dark:border-ocean-600 dark:text-ocean-400 dark:hover:bg-ocean-900/30"
            >
              View Details
            </Button>
          </Link>
          <ClientForm client={client}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-sm text-xs text-warm-600 hover:bg-warm-50 hover:text-ocean-600 dark:text-cream-400 dark:hover:bg-charcoal-800"
            >
              Edit
            </Button>
          </ClientForm>
          <ConfirmDeleteButton
            endpoint={`/api/clients/${client.id}`}
            entityLabel={client.name}
            entityKind="client"
          />
        </div>
      </CardContent>
    </Card>
  )
}
