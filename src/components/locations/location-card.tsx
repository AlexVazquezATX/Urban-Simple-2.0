import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Building2, CheckSquare, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LocationForm } from '@/components/forms/location-form'
import { getReviewFreshness } from '@/lib/operations/review-freshness'

interface LocationCardProps {
  location: LocationCardItem
  clientId: string
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

export function LocationCard({ location, clientId }: LocationCardProps) {
  const address = location.address
  const reviewFreshness = getReviewFreshness(location.reviews?.[0])
  const addressStr =
    typeof address === 'string'
      ? address
      : isAddressLike(address)
        ? `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.zip || ''}`.trim()
        : null

  return (
    <Card className="overflow-hidden rounded-sm border-warm-200 dark:border-charcoal-700 hover:border-ocean-400 hover:shadow-md transition-all p-0 flex flex-col h-full">
      <div className="relative h-36 bg-gradient-to-br from-warm-100 to-warm-50 dark:from-charcoal-800 dark:to-charcoal-900 rounded-t-sm overflow-hidden">
        {location.logoUrl ? (
          <Image
            src={location.logoUrl}
            alt={location.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Building2 className="h-24 w-24 text-warm-300 dark:text-charcoal-600" />
          </div>
        )}
        <div className="absolute top-2 right-2 z-10">
          <Badge
            className={`rounded-sm text-[10px] px-1.5 py-0 ${
              location.isActive
                ? 'bg-lime-100 text-lime-700 border-lime-200'
                : 'bg-warm-100 text-warm-600 border-warm-200'
            }`}
          >
            {location.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>
      <CardContent className="p-3 flex flex-col flex-1">
        <div className="flex flex-col flex-1">
          <div>
            <Link href={`/locations/${location.id}`}>
              <h3 className="text-base font-display font-medium text-warm-900 dark:text-cream-100 hover:text-ocean-600 transition-colors leading-tight">
                {location.name}
              </h3>
            </Link>
            {location.client && (
              <Link href={`/clients/${location.client.id}`}>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-warm-500 dark:text-cream-400 hover:text-ocean-600 transition-colors">
                  <Users className="h-2.5 w-2.5" />
                  <span className="truncate">{location.client.name}</span>
                </div>
              </Link>
            )}
          </div>

          <div className="space-y-1.5 text-xs mt-2">
            {addressStr && (
              <div className="flex items-start gap-1.5 text-warm-500 dark:text-cream-400">
                <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{addressStr}</span>
              </div>
            )}
            {location.checklistTemplate && (
              <div className="flex items-center gap-1.5 text-warm-500 dark:text-cream-400">
                <CheckSquare className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">
                  {location.checklistTemplate.name}
                </span>
              </div>
            )}
          </div>

          {location.accessInstructions && (
            <div className="text-[10px] text-warm-400 dark:text-cream-400 line-clamp-2 mt-2">
              {location.accessInstructions}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between gap-2 rounded-sm border border-warm-200 bg-warm-50/60 px-2 py-1.5 dark:border-charcoal-700 dark:bg-charcoal-800/60">
            <span className="text-[10px] uppercase tracking-wide text-warm-500 dark:text-cream-400">
              Review
            </span>
            <div className="text-right">
              <Badge
                className={`rounded-sm text-[10px] px-1.5 py-0 ${
                  reviewFreshness.isStale
                    ? 'bg-red-100 text-red-700 border-red-200'
                    : 'bg-lime-100 text-lime-700 border-lime-200'
                }`}
              >
                {reviewFreshness.shortLabel}
              </Badge>
            </div>
          </div>

          {/* Spacer pushes buttons to bottom */}
          <div className="flex-1 min-h-2" />

          <div className="flex items-center gap-1.5 pt-2 border-t border-warm-200 dark:border-charcoal-700 mt-2">
            <Link href={`/locations/${location.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full h-7 text-xs rounded-sm border-ocean-400 dark:border-ocean-600 text-ocean-600 dark:text-ocean-400 hover:bg-ocean-50 dark:hover:bg-ocean-900/30 hover:border-ocean-500">
                View Details
              </Button>
            </Link>
            <LocationForm clientId={clientId} location={location}>
              <Button variant="ghost" size="sm" className="h-7 text-xs rounded-sm text-warm-600 dark:text-cream-400 hover:text-ocean-600 hover:bg-warm-50 dark:hover:bg-charcoal-800">
                Edit
              </Button>
            </LocationForm>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function isAddressLike(value: unknown): value is AddressLike {
  return typeof value === 'object' && value !== null
}

