import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ClientForm } from '@/components/forms/client-form'
import { LocationForm } from '@/components/forms/location-form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getApiUrl } from '@/lib/api'

async function ClientDetail({ id }: { id: string }) {
  const response = await fetch(getApiUrl(`/api/clients/${id}`), {
    cache: 'no-store',
  })

  if (!response.ok) {
    return (
      <div className="text-destructive">
        Failed to load client. Please try again.
      </div>
    )
  }

  const client = await response.json()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/app/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{client.name}</h1>
            <p className="text-muted-foreground">
              {client.legalName && `${client.legalName} • `}
              {client.branch.name}
            </p>
          </div>
        </div>
        <ClientForm client={client}>
          <Button variant="outline">Edit Client</Button>
        </ClientForm>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Billing Email</p>
              <p className="font-medium">{client.billingEmail || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{client.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Terms</p>
              <p className="font-medium">{client.paymentTerms}</p>
            </div>
            {client.preferredPaymentMethod && (
              <div>
                <p className="text-sm text-muted-foreground">
                  Preferred Payment Method
                </p>
                <p className="font-medium capitalize">
                  {client.preferredPaymentMethod.replace('_', ' ')}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge
                variant={
                  client.status === 'active' ? 'default' : 'secondary'
                }
              >
                {client.status}
              </Badge>
            </div>
            {client.taxExempt && (
              <div>
                <Badge variant="outline">Tax Exempt</Badge>
              </div>
            )}
            {client.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="text-sm">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Locations</CardTitle>
                <CardDescription>
                  {client.locations.length}{' '}
                  {client.locations.length === 1 ? 'location' : 'locations'}
                </CardDescription>
              </div>
              <LocationForm clientId={client.id}>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Location
                </Button>
              </LocationForm>
            </div>
          </CardHeader>
          <CardContent>
            {client.locations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>No locations yet</p>
                <LocationForm clientId={client.id}>
                  <Button variant="outline" size="sm" className="mt-4">
                    Add First Location
                  </Button>
                </LocationForm>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.locations.map((location: any) => {
                    const address = location.address as any
                    const addressStr = address
                      ? `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.zip || ''}`.trim()
                      : '-'
                    return (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium">
                          {location.name}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {addressStr}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              location.isActive ? 'default' : 'secondary'
                            }
                          >
                            {location.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <LocationForm clientId={client.id} location={location}>
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          </LocationForm>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ClientDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={<ClientDetailSkeleton />}>
      <ClientDetail id={id} />
    </Suspense>
  )
}

