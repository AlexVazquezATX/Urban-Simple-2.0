'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { Plus, MapPin, Mail, Phone, User, Pencil, MoreHorizontal, Trash2 } from 'lucide-react'
import { LocationForm } from '@/components/forms/location-form'
import { ContactForm } from '@/components/forms/contact-form'
import { LocationCard } from '@/components/locations/location-card'
import { DeleteContactButton } from '@/components/clients/delete-contact-button'
import { PortalInviteButton } from '@/components/clients/portal-invite-button'
import { EditableClientInfo } from '@/components/clients/editable-client-info'
import { DocumentsTab } from '@/components/clients/tabs/documents-tab'
import { FacilitiesTab } from '@/components/clients/tabs/facilities-tab'
import { BillingPreviewTab } from '@/components/clients/tabs/billing-preview-tab'
import { ScheduleCalendarTab } from '@/components/clients/tabs/schedule-calendar-tab'
import { ChangelogTab } from '@/components/clients/tabs/changelog-tab'
import { DeltaReportTab } from '@/components/clients/tabs/delta-report-tab'

interface ClientDetailTabsProps {
  client: any
}

export function ClientDetailTabs({ client }: ClientDetailTabsProps) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="w-full overflow-x-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="facilities">
          Facilities
          {client.facilityProfiles?.length > 0 && (
            <Badge variant="neutral" className="px-1.5 py-0 font-mono text-[10px]">
              {client.facilityProfiles.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="billing">Billing Preview</TabsTrigger>
        <TabsTrigger value="calendar">Calendar</TabsTrigger>
        <TabsTrigger value="delta">Delta Report</TabsTrigger>
        <TabsTrigger value="changelog">Change Log</TabsTrigger>
        <TabsTrigger value="documents">Documents</TabsTrigger>
      </TabsList>

      {/* Overview Tab — existing client detail content */}
      <TabsContent value="overview" className="space-y-6 mt-4">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Client Information — editable in place */}
          <EditableClientInfo client={client} />

          {/* Contacts Card */}
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
                  <Button variant="outline" size="sm">
                    <Plus className="size-4" />
                    Add Contact
                  </Button>
                </ContactForm>
              </div>
            </CardHeader>
            <CardContent>
              {client.contacts.length === 0 ? (
                <EmptyState
                  icon={User}
                  title="No contacts yet"
                  description={`Add the people you coordinate with at ${client.name}.`}
                  action={
                    <ContactForm clientId={client.id}>
                      <Button variant="outline" size="sm">
                        Add First Contact
                      </Button>
                    </ContactForm>
                  }
                />
              ) : (
                <div className="space-y-3">
                  {client.contacts.map((contact: any) => (
                    <div
                      key={contact.id}
                      className="flex items-start justify-between rounded-[10px] border border-border p-3 transition-colors hover:bg-secondary/40"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">
                            {contact.firstName} {contact.lastName}
                          </p>
                          <Badge variant="neutral" className="capitalize">
                            {contact.role}
                          </Badge>
                          {contact.isPortalUser && <Badge variant="teal">Portal</Badge>}
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
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
                        <PortalInviteButton
                          clientId={client.id}
                          contactId={contact.id}
                          contactEmail={contact.email}
                          isPortalUser={!!contact.isPortalUser}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${contact.firstName} ${contact.lastName}`}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <ContactForm clientId={client.id} contact={contact}>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Pencil className="size-4" />
                                Edit
                              </DropdownMenuItem>
                            </ContactForm>
                            <DeleteContactButton clientId={client.id} contactId={contact.id}>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="size-4" />
                                Delete
                              </DropdownMenuItem>
                            </DeleteContactButton>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Locations Section */}
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
                <Button variant="gold">
                  <Plus className="size-4" />
                  Add Location
                </Button>
              </LocationForm>
            </div>
          </CardHeader>
          <CardContent>
            {client.locations.length === 0 ? (
              <EmptyState
                icon={MapPin}
                title="No locations yet"
                description={`Add locations for ${client.name} to start scheduling service.`}
                action={
                  <LocationForm clientId={client.id}>
                    <Button variant="outline">
                      <Plus className="size-4" />
                      Add First Location
                    </Button>
                  </LocationForm>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {client.locations.map((location: any) => (
                  <LocationCard key={location.id} location={location} />
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
              <span className="font-mono font-medium tabular-nums text-foreground">
                {client._count.invoices}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Payments</span>
              <span className="font-mono font-medium tabular-nums text-foreground">
                {client._count.payments}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Open Issues</span>
              <Badge variant={client._count.issues > 0 ? 'coral' : 'neutral'}>
                {client._count.issues}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Facilities Tab */}
      <TabsContent value="facilities" className="mt-4">
        <FacilitiesTab
          clientId={client.id}
          facilities={client.facilityProfiles || []}
          locations={client.locations || []}
        />
      </TabsContent>

      {/* Billing Preview Tab */}
      <TabsContent value="billing" className="mt-4">
        <BillingPreviewTab
          clientId={client.id}
          facilities={(client.facilityProfiles || []).map((fp: any) => ({
            id: fp.id,
            location: { name: fp.location?.name || 'Unknown' },
          }))}
        />
      </TabsContent>

      {/* Calendar Tab */}
      <TabsContent value="calendar" className="mt-4">
        <ScheduleCalendarTab clientId={client.id} />
      </TabsContent>

      <TabsContent value="delta" className="mt-4">
        <DeltaReportTab clientId={client.id} />
      </TabsContent>

      <TabsContent value="changelog" className="mt-4">
        <ChangelogTab clientId={client.id} />
      </TabsContent>

      <TabsContent value="documents" className="mt-4">
        <DocumentsTab clientId={client.id} />
      </TabsContent>
    </Tabs>
  )
}
