import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Building2, CheckSquare, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LocationRowActions } from './location-row-actions'
import { marginTone, reviewBadgeVariant } from './tones'
import { getReviewFreshness } from '@/lib/operations/review-freshness'
import { formatMargin, type FinancialSummary } from '@/lib/financials'
import { formatMoney, moneyClass } from '@/lib/format'
import { cn } from '@/lib/utils'

interface LocationCardProps {
  location: LocationCardItem & { financials?: FinancialSummary | null }
  showFinancials?: boolean
}

type AddressLike = {
  street?: string
  city?: string
  state?: string
  zip?: string
}

type LocationCardItem = {
  id: string
  name: string
  logoUrl?: string | null
  isActive: boolean
  address?: unknown
  client?: {
    id: string
    name: string
  } | null
  checklistTemplate?: {
    name: string
  } | null
  accessInstructions?: string | null
  reviews?: Array<{
    id: string
    reviewDate?: Date | string | null
    createdAt?: Date | string | null
    photos?: string[] | null
  }>
}

export function LocationCard({ location, showFinancials = false }: LocationCardProps) {
  const address = location.address
  const reviewFreshness = getReviewFreshness(location.reviews?.[0])
  const addressStr =
    typeof address === 'string'
      ? address
      : isAddressLike(address)
        ? `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.zip || ''}`.trim()
        : null

  return (
    <Card className="flex h-full flex-col p-0 transition-colors hover:border-primary/40">
      <CardContent className="flex flex-1 flex-col p-4">
        {/* Header: compact logo/icon + name + client + status */}
        <div className="flex items-start gap-2.5">
          {location.logoUrl ? (
            <div className="relative size-11 shrink-0 overflow-hidden rounded-[10px] bg-secondary">
              <Image src={location.logoUrl} alt={location.name} fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-secondary">
              <Building2 className="size-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link href={`/locations/${location.id}`}>
              <h3 className="truncate font-display text-[15px] font-semibold leading-tight tracking-[-0.2px] text-foreground transition-colors hover:text-primary">
                {location.name}
              </h3>
            </Link>
            {location.client && (
              <Link href={`/clients/${location.client.id}`}>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary">
                  <Users className="size-2.5 shrink-0" />
                  <span className="truncate">{location.client.name}</span>
                </div>
              </Link>
            )}
          </div>
          <Badge variant={location.isActive ? 'green' : 'neutral'} className="shrink-0">
            {location.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Details */}
        {(addressStr || location.checklistTemplate) && (
          <div className="mt-2.5 space-y-1 text-xs">
            {addressStr && (
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <MapPin className="mt-0.5 size-3 flex-shrink-0" />
                <span className="line-clamp-1">{addressStr}</span>
              </div>
            )}
            {location.checklistTemplate && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <CheckSquare className="size-3 flex-shrink-0" />
                <span className="truncate">{location.checklistTemplate.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Review freshness */}
        <div className="mt-2 flex items-center justify-between gap-2 rounded-[10px] border border-border bg-secondary/50 px-2.5 py-1.5">
          <span className="kicker text-muted-foreground">Review</span>
          <Badge variant={reviewBadgeVariant(reviewFreshness)}>
            {reviewFreshness.shortLabel}
          </Badge>
        </div>

        {showFinancials && location.financials && location.financials.agreementCount > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-[10px] border border-border bg-secondary/40 p-2.5">
            <div>
              <p className="kicker text-muted-foreground">MRR</p>
              <p className={cn('mt-0.5 text-sm font-medium text-foreground', moneyClass)}>
                {formatMoney(location.financials.monthlyRevenue)}
              </p>
            </div>
            <div>
              <p className="kicker text-muted-foreground">Profit</p>
              <p
                className={cn(
                  'mt-0.5 text-sm font-medium',
                  moneyClass,
                  marginTone(location.financials.marginPct)
                )}
              >
                {formatMoney(location.financials.monthlyProfit)}
              </p>
            </div>
            <div>
              <p className="kicker text-muted-foreground">Margin</p>
              <p
                className={cn(
                  'mt-0.5 text-sm font-medium',
                  moneyClass,
                  marginTone(location.financials.marginPct)
                )}
              >
                {formatMargin(location.financials.marginPct)}
              </p>
            </div>
          </div>
        )}

        {/* Spacer pushes the action row to the bottom */}
        <div className="min-h-2 flex-1" />

        <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2">
          <Button asChild variant="ghost" size="sm" className="h-7 flex-1 text-xs">
            <Link href={`/locations/${location.id}`}>View Details</Link>
          </Button>
          <LocationRowActions locationId={location.id} entityLabel={location.name} />
        </div>
      </CardContent>
    </Card>
  )
}

function isAddressLike(value: unknown): value is AddressLike {
  return typeof value === 'object' && value !== null
}
