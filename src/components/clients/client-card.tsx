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
    <Card className="overflow-hidden hover:shadow-lg transition-shadow p-0">
      <div className="relative h-36 bg-gradient-to-br from-primary/10 to-primary/5 rounded-t-xl overflow-hidden">
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
            <Building2 className="h-24 w-24 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute top-2 right-2 z-10">
          <Badge
            variant={client.status === 'active' ? 'default' : 'secondary'}
          >
            {client.status}
          </Badge>
        </div>
      </div>
      <CardContent className="p-4 pt-4">
        <div className="space-y-3">
          <div>
            <Link href={`/clients/${client.id}`}>
              <h3 className="font-semibold text-lg hover:text-primary transition-colors">
                {client.name}
              </h3>
            </Link>
            {client.legalName && (
              <p className="text-sm text-muted-foreground">
                {client.legalName}
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm">
            {addressStr && (
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{addressStr}</span>
              </div>
            )}
            {client.billingEmail && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{client.billingEmail}</span>
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>{client.phone}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline">{client.branch.code}</Badge>
            <Badge variant="outline">{client.paymentTerms}</Badge>
            {client.locations.length > 0 && (
              <Badge variant="secondary">
                {client.locations.length}{' '}
                {client.locations.length === 1 ? 'location' : 'locations'}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t">
            <Link href={`/clients/${client.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                View Details
              </Button>
            </Link>
            <ClientForm client={client}>
              <Button variant="ghost" size="sm">
                Edit
              </Button>
            </ClientForm>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

