import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Plus, MapPin, Mail, Phone, User, Trash2, Edit, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ClientForm } from '@/components/forms/client-form'
import { LocationForm } from '@/components/forms/location-form'
import { ContactForm } from '@/components/forms/contact-form'
import { LocationCard } from '@/components/locations/location-card'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { DeleteContactButton } from '@/components/clients/delete-contact-button'

async function ClientDetail({ id }: { id: string }) {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  const client = await prisma.client.findFirst({
    where: {
      id,
      companyId: user.companyId,
    },
    include: {
      branch: {
        select: {
          name: true,
          code: true,
        },
      },
      locations: {
        include: {
          branch: {
            select: {
              name: true,
              code: true,
            },
          },
          checklistTemplate: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              serviceAgreements: {
                where: {
                  isActive: true,
                },
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      },
      contacts: {
        orderBy: [
          { role: 'asc' },
          { createdAt: 'asc' },
        ],
      },
      _count: {
        select: {
          invoices: true,
          payments: true,
          issues: {
            where: {
              status: {
                in: ['open', 'in_progress'],
              },
            },
          },
        },
      },
    },
  })

  if (!client) {
    return (
      <div className="text-destructive">
        Client not found. Please try again.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{client.name}</h1>
            <p className="text-muted-foreground">
              {client.legalName && `${client.legalName} • `}
              {client.branch.name}
              {client.locations.length > 0 && (
                <span className="ml-2">
                  • {client.locations.length}{' '}
                  {client.locations.length === 1 ? 'location' : 'locations'}
                </span>
              )}
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
            {client.logoUrl && (
              <div className="relative h-32 w-full rounded-lg overflow-hidden border bg-muted">
                <Image
                  src={client.logoUrl}
                  alt={client.name}
                  fill
                  className="object-contain p-2"
                  unoptimized
                />
              </div>
            )}
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
            <div className="flex items-center gap-4">
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
                <Badge variant="outline">Tax Exempt</Badge>
              )}
            </div>
            {client.healthScore !== null && (
              <div>
                <p className="text-sm text-muted-foreground">Health Score</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        (client.healthScore || 0) >= 80
                          ? 'bg-green-500'
                          : (client.healthScore || 0) >= 60
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${client.healthScore || 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {client.healthScore}/100
                  </span>
                </div>
              </div>
            )}
            {(client.loyaltyPoints > 0 || client.loyaltyTier !== 'bronze') && (
              <div>
                <p className="text-sm text-muted-foreground">Loyalty</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {client.loyaltyTier}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {client.loyaltyPoints} points
                  </span>
                </div>
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
                <CardTitle>Contacts</CardTitle>
                <CardDescription>
                  {client.contacts.length}{' '}
                  {client.contacts.length === 1 ? 'contact' : 'contacts'}
                </CardDescription>
              </div>
              <ContactForm clientId={client.id}>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              </ContactForm>
            </div>
          </CardHeader>
          <CardContent>
            {client.contacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <User className="mx-auto h-12 w-12 mb-2 opacity-50" />
                <p>No contacts yet</p>
                <ContactForm clientId={client.id}>
                  <Button variant="outline" size="sm" className="mt-4">
                    Add First Contact
                  </Button>
                </ContactForm>
              </div>
            ) : (
              <div className="space-y-3">
                {client.contacts.map((contact: any) => (
                  <div
                    key={contact.id}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <Badge variant="outline" className="text-xs capitalize">
                          {contact.role}
                        </Badge>
                        {contact.isPortalUser && (
                          <Badge variant="secondary" className="text-xs">
                            Portal
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {contact.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contact.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <ContactForm clientId={client.id} contact={contact}>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </ContactForm>
                      <DeleteContactButton
                        clientId={client.id}
                        contactId={contact.id}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Locations Section - Full Width */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Locations</CardTitle>
              <CardDescription>
                {client.locations.length}{' '}
                {client.locations.length === 1 ? 'location' : 'locations'} for{' '}
                {client.name}
              </CardDescription>
            </div>
            <LocationForm clientId={client.id}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            </LocationForm>
          </div>
        </CardHeader>
        <CardContent>
          {client.locations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="mx-auto h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No locations yet</p>
              <p className="text-sm mb-4">
                Add locations for {client.name} to get started
              </p>
              <LocationForm clientId={client.id}>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Location
                </Button>
              </LocationForm>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {client.locations.map((location: any) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  clientId={client.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Invoices</span>
            <span className="font-medium">{client._count.invoices}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Payments</span>
            <span className="font-medium">{client._count.payments}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Open Issues</span>
            <Badge
              variant={
                client._count.issues > 0 ? 'destructive' : 'secondary'
              }
            >
              {client._count.issues}
            </Badge>
          </div>
        </CardContent>
      </Card>
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

