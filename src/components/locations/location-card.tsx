import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Building2, CheckSquare, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LocationForm } from '@/components/forms/location-form'
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button'
import { getReviewFreshness } from '@/lib/operations/review-freshness'
import { formatCurrency, formatMargin, marginToneClass, type FinancialSummary } from '@/lib/financials'

interface LocationCardProps {
  location: LocationCardItem & { financials?: FinancialSummary | null }
  clientId: string
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

export function LocationCard({ location, clientId, showFinancials = false }: LocationCardProps) {
  const address = location.address
  const reviewFreshness = getReviewFreshness(location.reviews?.[0])
  const addressStr =
    typeof address === 'string'
      ? address
      : isAddressLike(address)
        ? `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.zip || ''}`.trim()
        : null

  return (
    <Card className="flex h-full flex-col rounded-sm border-warm-200 p-0 transition-colors hover:border-ocean-300 dark:border-charcoal-700">
      <CardContent className="flex flex-1 flex-col p-3">
        {/* Header: compact logo/icon + name + client + status */}
        <div className="flex items-start gap-2.5">
          {location.logoUrl ? (
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-sm bg-warm-100 dark:bg-charcoal-800">
              <Image src={location.logoUrl} alt={location.name} fill className="object-cover" unoptimized />
            </div>
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-warm-100 dark:bg-charcoal-800">
              <Building2 className="h-5 w-5 text-warm-400 dark:text-cream-500" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <Link href={`/locations/${location.id}`}>
              <h3 className="truncate text-base font-display font-medium leading-tight text-warm-900 transition-colors hover:text-ocean-600 dark:text-cream-100">
                {location.name}
              </h3>
            </Link>
            {location.client && (
              <Link href={`/clients/${location.client.id}`}>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-warm-500 transition-colors hover:text-ocean-600 dark:text-cream-400">
                  <Users className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{location.client.name}</span>
                </div>
              </Link>
            )}
          </div>
          <Badge
            className={`shrink-0 rounded-sm px-1.5 py-0 text-[10px] ${
              location.isActive
                ? 'border-lime-200 bg-lime-100 text-lime-700'
                : 'border-warm-200 bg-warm-100 text-warm-600'
            }`}
          >
            {location.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Details */}
        {(addressStr || location.checklistTemplate) && (
          <div className="mt-2.5 space-y-1 text-xs">
            {addressStr && (
              <div className="flex items-start gap-1.5 text-warm-500 dark:text-cream-400">
                <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
                <span className="line-clamp-1">{addressStr}</span>
              </div>
            )}
            {location.checklistTemplate && (
              <div className="flex items-center gap-1.5 text-warm-500 dark:text-cream-400">
                <CheckSquare className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{location.checklistTemplate.name}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-2 rounded-sm border border-warm-200 bg-warm-50/60 px-2 py-1.5 dark:border-charcoal-700 dark:bg-charcoal-800/60">
          <span className="text-[10px] uppercase tracking-wide text-warm-500 dark:text-cream-400">
            Review
          </span>
          <Badge
            className={`rounded-sm px-1.5 py-0 text-[10px] ${
              reviewFreshness.isStale
                ? 'border-red-200 bg-red-100 text-red-700'
                : 'border-lime-200 bg-lime-100 text-lime-700'
            }`}
          >
            {reviewFreshness.shortLabel}
          </Badge>
        </div>

        {showFinancials && location.financials && location.financials.agreementCount > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-sm border border-warm-200 bg-warm-50/50 p-2 text-[10px] dark:border-charcoal-700 dark:bg-charcoal-900/40">
            <div>
              <p className="uppercase tracking-wider text-warm-500 dark:text-cream-400">MRR</p>
              <p className="font-mono font-medium text-warm-900 dark:text-cream-100">
                {formatCurrency(location.financials.monthlyRevenue)}
              </p>
            </div>
            <div>
              <p className="uppercase tracking-wider text-warm-500 dark:text-cream-400">Profit</p>
              <p className={`font-mono font-medium ${marginToneClass(location.financials.marginPct)}`}>
                {formatCurrency(location.financials.monthlyProfit)}
              </p>
            </div>
            <div>
              <p className="uppercase tracking-wider text-warm-500 dark:text-cream-400">Margin</p>
              <p className={`font-mono font-medium ${marginToneClass(location.financials.marginPct)}`}>
                {formatMargin(location.financials.marginPct)}
              </p>
            </div>
          </div>
        )}

        {/* Spacer pushes the action row to the bottom */}
        <div className="min-h-2 flex-1" />

        <div className="mt-2 flex items-center gap-1.5 border-t border-warm-200 pt-2 dark:border-charcoal-700">
          <Link href={`/locations/${location.id}`} className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-full rounded-sm border-ocean-400 text-xs text-ocean-600 hover:border-ocean-500 hover:bg-ocean-50 dark:border-ocean-600 dark:text-ocean-400 dark:hover:bg-ocean-900/30"
            >
              View Details
            </Button>
          </Link>
          <LocationForm clientId={clientId} location={location}>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-sm text-xs text-warm-600 hover:bg-warm-50 hover:text-ocean-600 dark:text-cream-400 dark:hover:bg-charcoal-800"
            >
              Edit
            </Button>
          </LocationForm>
          <ConfirmDeleteButton
            endpoint={`/api/locations/${location.id}`}
            entityLabel={location.name}
            entityKind="location"
          />
        </div>
      </CardContent>
    </Card>
  )
}

function isAddressLike(value: unknown): value is AddressLike {
  return typeof value === 'object' && value !== null
}
