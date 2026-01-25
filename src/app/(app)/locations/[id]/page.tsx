import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, MapPin, Building2, CheckSquare, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LocationForm } from '@/components/forms/location-form'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function LocationDetail({ id }: { id: string }) {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  const location = await prisma.location.findFirst({
    where: {
      id,
      client: {
        companyId: user.companyId,
      },
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
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
      assignments: {
        where: {
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          serviceLogs: true,
          issues: {
            where: {
              status: {
                in: ['open', 'in_progress'],
              },
            },
          },
          serviceAgreements: {
            where: {
              isActive: true,
            },
          },
        },
      },
    },
  })

  if (!location) {
    return (
      <div className="text-destructive">
        Location not found. Please try again.
      </div>
    )
  }

  const address = location.address as any
  const addressStr = address
    ? `${address.street || ''} ${address.city || ''} ${address.state || ''} ${address.zip || ''}`.trim()
    : null
  const equipmentInventory = (location.equipmentInventory as any[]) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/clients/${location.client.id}`}>
            <Button variant="ghost" size="icon" className="rounded-sm text-warm-600 hover:text-ocean-600 hover:bg-warm-50">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900">{location.name}</h1>
            <p className="text-sm text-warm-500">
              {location.client.name} • {location.branch.name}
            </p>
          </div>
        </div>
        <LocationForm clientId={location.client.id} location={location}>
          <Button variant="outline" className="rounded-sm border-warm-200 text-warm-700 hover:border-ocean-400 hover:bg-warm-50">Edit Location</Button>
        </LocationForm>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-sm border-warm-200">
          <CardHeader>
            <CardTitle className="font-display font-medium text-warm-900">Location Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {location.logoUrl && (
              <div className="relative h-64 w-full rounded-sm overflow-hidden border border-warm-200 bg-warm-50">
                <Image
                  src={location.logoUrl}
                  alt={location.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            {addressStr && (
              <div>
                <p className="text-sm text-warm-500">Address</p>
                <p className="font-medium text-warm-900">{addressStr}</p>
              </div>
            )}
            {location.accessInstructions && (
              <div>
                <p className="text-sm text-warm-500">
                  Access Instructions
                </p>
                <p className="text-sm text-warm-700">{location.accessInstructions}</p>
              </div>
            )}
            {location.serviceNotes && (
              <div>
                <p className="text-sm text-warm-500">Service Notes</p>
                <p className="text-sm text-warm-700">{location.serviceNotes}</p>
              </div>
            )}
            {location.painPoints && (
              <div>
                <p className="text-sm text-warm-500">Pain Points</p>
                <p className="text-sm text-red-600">{location.painPoints}</p>
              </div>
            )}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
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
              {location.checklistTemplate ? (
                <div className="p-3 border border-warm-200 rounded-sm bg-warm-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-warm-500" />
                      <div>
                        <p className="text-sm font-medium text-warm-900">Assigned Checklist</p>
                        <p className="text-xs text-warm-500">
                          {location.checklistTemplate.name}
                        </p>
                      </div>
                    </div>
                    <Link href={`/operations/checklists/${location.checklistTemplate.id}`}>
                      <Button variant="outline" size="sm" className="rounded-sm border-warm-200 text-warm-700 hover:border-ocean-400">
                        View Checklist
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-3 border border-warm-200 rounded-sm bg-warm-50/50">
                  <p className="text-sm text-warm-500">
                    No checklist assigned. Edit location to assign one.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-warm-200">
          <CardHeader>
            <CardTitle className="font-display font-medium text-warm-900">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-warm-500">
                Service Logs
              </span>
              <span className="font-medium text-warm-900">
                {location._count.serviceLogs}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-warm-500">
                Open Issues
              </span>
              <Badge
                className={`rounded-sm text-[10px] px-1.5 py-0 ${
                  location._count.issues > 0
                    ? 'bg-red-100 text-red-700 border-red-200'
                    : 'bg-warm-100 text-warm-600 border-warm-200'
                }`}
              >
                {location._count.issues}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-warm-500">
                Active Agreements
              </span>
              <span className="font-medium text-warm-900">
                {location._count.serviceAgreements}
              </span>
            </div>
            {location.assignments.length > 0 && (
              <div className="pt-3 border-t border-warm-200">
                <p className="text-sm text-warm-500 mb-2">
                  Assigned Associates
                </p>
                <div className="space-y-1">
                  {location.assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="text-sm flex items-center justify-between"
                    >
                      <span className="text-warm-700">
                        {assignment.user.firstName} {assignment.user.lastName}
                      </span>
                      <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300 text-warm-600">
                        ${Number(assignment.monthlyPay).toFixed(2)}/mo
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {equipmentInventory.length > 0 && (
        <Card className="rounded-sm border-warm-200">
          <CardHeader>
            <CardTitle className="font-display font-medium text-warm-900">Equipment Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {equipmentInventory.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 border border-warm-200 rounded-sm hover:border-ocean-400 transition-colors"
                >
                  <Wrench className="h-4 w-4 text-warm-500" />
                  <span className="text-sm text-warm-700">
                    {typeof item === 'string' ? item : item.name || 'Unknown'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function LocationDetailSkeleton() {
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
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={<LocationDetailSkeleton />}>
      <LocationDetail id={id} />
    </Suspense>
  )
}

