import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Building2, CheckSquare, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LocationForm } from '@/components/forms/location-form'

interface LocationCardProps {
  location: any
  clientId: string
}

export function LocationCard({ location, clientId }: LocationCardProps) {
  const address = location.address as any
  const addressStr = address
    ? `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.zip || ''}`.trim()
    : null

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow p-0">
      <div className="relative h-36 bg-gradient-to-br from-primary/10 to-primary/5 rounded-t-xl overflow-hidden">
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
            <Building2 className="h-24 w-24 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute top-2 right-2 z-10">
          <Badge variant={location.isActive ? 'default' : 'secondary'}>
            {location.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4 pt-4">
        <div className="space-y-3">
          <div>
            <Link href={`/locations/${location.id}`}>
              <h3 className="font-semibold text-lg hover:text-primary transition-colors">
                {location.name}
              </h3>
            </Link>
            {location.client && (
              <Link href={`/clients/${location.client.id}`}>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground hover:text-ocean-600 transition-colors">
                  <Users className="h-3 w-3" />
                  <span className="truncate">{location.client.name}</span>
                </div>
              </Link>
            )}
          </div>

          <div className="space-y-2 text-sm">
            {addressStr && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{addressStr}</span>
              </div>
            )}
            {location.checklistTemplate && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckSquare className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">
                  {location.checklistTemplate.name}
                </span>
              </div>
            )}
          </div>

          {location.accessInstructions && (
            <div className="text-xs text-muted-foreground line-clamp-2">
              {location.accessInstructions}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t">
            <Link href={`/locations/${location.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                View Details
              </Button>
            </Link>
            <LocationForm clientId={clientId} location={location}>
              <Button variant="ghost" size="sm">
                Edit
              </Button>
            </LocationForm>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

