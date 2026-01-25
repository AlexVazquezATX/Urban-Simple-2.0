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
            <Button variant="ghost" size="icon" className="rounded-sm text-warm-600 hover:text-ocean-600 hover:bg-warm-50">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900">{client.name}</h1>
            <p className="text-sm text-warm-500">
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
          <Button variant="outline" className="rounded-sm border-warm-200 text-warm-700 hover:border-ocean-400 hover:bg-warm-50">Edit Client</Button>
        </ClientForm>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-sm border-warm-200">
          <CardHeader>
            <CardTitle className="font-display font-medium text-warm-900">Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.logoUrl && (
              <div className="relative h-32 w-full rounded-sm overflow-hidden border border-warm-200 bg-warm-50">
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
              <p className="text-sm text-warm-500">Billing Email</p>
              <p className="font-medium text-warm-900">{client.billingEmail || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-warm-500">Phone</p>
              <p className="font-medium text-warm-900">{client.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-warm-500">Payment Terms</p>
              <p className="font-medium text-warm-900">{client.paymentTerms}</p>
            </div>
            {client.preferredPaymentMethod && (
              <div>
                <p className="text-sm text-warm-500">
                  Preferred Payment Method
                </p>
                <p className="font-medium capitalize text-warm-900">
                  {client.preferredPaymentMethod.replace('_', ' ')}
                </p>
              </div>
            )}
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-warm-500">Status</p>
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
              {client.taxExempt && (
                <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300 text-warm-600">Tax Exempt</Badge>
              )}
            </div>
            {client.healthScore !== null && (
              <div>
                <p className="text-sm text-warm-500">Health Score</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-warm-100 rounded-sm overflow-hidden">
                    <div
                      className={`h-full ${
                        (client.healthScore || 0) >= 80
                          ? 'bg-lime-500'
                          : (client.healthScore || 0) >= 60
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${client.healthScore || 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-warm-700">
                    {client.healthScore}/100
                  </span>
                </div>
              </div>
            )}
            {(client.loyaltyPoints > 0 || client.loyaltyTier !== 'bronze') && (
              <div>
                <p className="text-sm text-warm-500">Loyalty</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize rounded-sm text-[10px] px-1.5 py-0 border-warm-300 text-warm-600">
                    {client.loyaltyTier}
                  </Badge>
                  <span className="text-sm text-warm-500">
                    {client.loyaltyPoints} points
                  </span>
                </div>
              </div>
            )}
            {client.notes && (
              <div>
                <p className="text-sm text-warm-500">Notes</p>
                <p className="text-sm text-warm-700">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-sm border-warm-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display font-medium text-warm-900">Contacts</CardTitle>
                <CardDescription className="text-warm-500">
                  {client.contacts.length}{' '}
                  {client.contacts.length === 1 ? 'contact' : 'contacts'}
                </CardDescription>
              </div>
              <ContactForm clientId={client.id}>
                <Button variant="lime" size="sm" className="rounded-sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              </ContactForm>
            </div>
          </CardHeader>
          <CardContent>
            {client.contacts.length === 0 ? (
              <div className="text-center py-8 text-warm-500">
                <User className="mx-auto h-12 w-12 mb-2 text-warm-400" />
                <p>No contacts yet</p>
                <ContactForm clientId={client.id}>
                  <Button variant="outline" size="sm" className="mt-4 rounded-sm border-warm-200 text-warm-700 hover:border-ocean-400">
                    Add First Contact
                  </Button>
                </ContactForm>
              </div>
            ) : (
              <div className="space-y-3">
                {client.contacts.map((contact: any) => (
                  <div
                    key={contact.id}
                    className="flex items-start justify-between p-3 border border-warm-200 rounded-sm hover:border-ocean-400 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-warm-900">
                          {contact.firstName} {contact.lastName}
                        </p>
                        <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 capitalize border-warm-300 text-warm-600">
                          {contact.role}
                        </Badge>
                        {contact.isPortalUser && (
                          <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-ocean-100 text-ocean-700 border-ocean-200">
                            Portal
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-warm-500">
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
                        <Button variant="ghost" size="sm" className="rounded-sm text-warm-600 hover:text-ocean-600 hover:bg-warm-50">
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
      <Card className="rounded-sm border-warm-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display font-medium text-warm-900">Locations</CardTitle>
              <CardDescription className="text-warm-500">
                {client.locations.length}{' '}
                {client.locations.length === 1 ? 'location' : 'locations'} for{' '}
                {client.name}
              </CardDescription>
            </div>
            <LocationForm clientId={client.id}>
              <Button variant="lime" className="rounded-sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            </LocationForm>
          </div>
        </CardHeader>
        <CardContent>
          {client.locations.length === 0 ? (
            <div className="text-center py-12 text-warm-500">
              <MapPin className="mx-auto h-16 w-16 mb-4 text-warm-400" />
              <p className="text-lg font-medium mb-2 text-warm-700">No locations yet</p>
              <p className="text-sm mb-4">
                Add locations for {client.name} to get started
              </p>
              <LocationForm clientId={client.id}>
                <Button variant="outline" className="rounded-sm border-warm-200 text-warm-700 hover:border-ocean-400">
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
      <Card className="rounded-sm border-warm-200">
        <CardHeader>
          <CardTitle className="font-display font-medium text-warm-900">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-warm-500">Invoices</span>
            <span className="font-medium text-warm-900">{client._count.invoices}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-warm-500">Payments</span>
            <span className="font-medium text-warm-900">{client._count.payments}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-warm-500">Open Issues</span>
            <Badge
              className={`rounded-sm text-[10px] px-1.5 py-0 ${
                client._count.issues > 0
                  ? 'bg-red-100 text-red-700 border-red-200'
                  : 'bg-warm-100 text-warm-600 border-warm-200'
              }`}
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

