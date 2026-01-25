import Link from 'next/link'
import Image from 'next/image'
import { MapPin, Mail, Phone, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ClientForm } from '@/components/forms/client-form'

interface ClientCardProps {
  client: any
}

export function ClientCard({ client }: ClientCardProps) {
  const address = client.address as any
  const addressStr = address
    ? `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.zip || ''}`.trim()
    : null

  return (
    <Card className="overflow-hidden rounded-sm border-warm-200 hover:border-ocean-400 hover:shadow-md transition-all p-0">
      <div className="relative h-36 bg-gradient-to-br from-warm-100 to-warm-50 rounded-t-sm overflow-hidden">
        {client.logoUrl ? (
          <Image
            src={client.logoUrl}
            alt={client.name}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Building2 className="h-24 w-24 text-warm-300" />
          </div>
        )}
        <div className="absolute top-2 right-2 z-10">
          <Badge
            className={`rounded-sm text-[10px] px-1.5 py-0 ${
              client.status === 'active'
                ? 'bg-lime-100 text-lime-700 border-lime-200'
                : 'bg-warm-100 text-warm-600 border-warm-200'
            }`}
          >
            {client.status}
          </Badge>
        </div>
      </div>
      <CardContent className="p-3">
        <div className="space-y-2">
          <div>
            <Link href={`/clients/${client.id}`}>
              <h3 className="text-base font-display font-medium text-warm-900 hover:text-ocean-600 transition-colors leading-tight">
                {client.name}
              </h3>
            </Link>
            {client.legalName && (
              <p className="text-xs text-warm-500 mt-0.5">
                {client.legalName}
              </p>
            )}
          </div>

          <div className="space-y-1.5 text-xs">
            {addressStr && (
              <div className="flex items-start gap-1.5 text-warm-500">
                <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{addressStr}</span>
              </div>
            )}
            {client.billingEmail && (
              <div className="flex items-center gap-1.5 text-warm-500">
                <Mail className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{client.billingEmail}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-1.5 text-warm-500">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <span>{client.phone}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="rounded-sm text-[9px] px-1 py-0 border-warm-300 text-warm-600">{client.branch.code}</Badge>
            <Badge variant="outline" className="rounded-sm text-[9px] px-1 py-0 border-warm-300 text-warm-600">{client.paymentTerms}</Badge>
            {client.locations.length > 0 && (
              <Badge className="rounded-sm text-[9px] px-1 py-0 bg-ocean-100 text-ocean-700 border-ocean-200">
                {client.locations.length}{' '}
                {client.locations.length === 1 ? 'location' : 'locations'}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 pt-2 border-t border-warm-200">
            <Link href={`/clients/${client.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full h-7 text-xs rounded-sm border-warm-200 text-warm-700 hover:border-ocean-400">
                View Details
              </Button>
            </Link>
            <ClientForm client={client}>
              <Button variant="ghost" size="sm" className="h-7 text-xs rounded-sm text-warm-600 hover:text-ocean-600 hover:bg-warm-50">
                Edit
              </Button>
            </ClientForm>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

