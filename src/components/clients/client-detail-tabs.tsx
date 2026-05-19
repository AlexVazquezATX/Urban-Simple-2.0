'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, MapPin, Mail, Phone, User, Edit } from 'lucide-react'
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
      <TabsList className="bg-warm-100 dark:bg-charcoal-800 border border-warm-200 dark:border-charcoal-700">
        <TabsTrigger value="overview" className="data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900 data-[state=active]:text-warm-900 dark:data-[state=active]:text-cream-100 text-warm-600 dark:text-cream-400">
          Overview
        </TabsTrigger>
        <TabsTrigger value="facilities" className="data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900 data-[state=active]:text-warm-900 dark:data-[state=active]:text-cream-100 text-warm-600 dark:text-cream-400">
          Facilities
          {client.facilityProfiles?.length > 0 && (
            <Badge className="ml-1.5 rounded-sm text-[9px] px-1 py-0 bg-warm-200 dark:bg-charcoal-700 text-warm-600 dark:text-cream-400 border-0">
              {client.facilityProfiles.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="billing" className="data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900 data-[state=active]:text-warm-900 dark:data-[state=active]:text-cream-100 text-warm-600 dark:text-cream-400">
          Billing Preview
        </TabsTrigger>
        <TabsTrigger value="calendar" className="data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900 data-[state=active]:text-warm-900 dark:data-[state=active]:text-cream-100 text-warm-600 dark:text-cream-400">
          Calendar
        </TabsTrigger>
        <TabsTrigger value="delta" className="data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900 data-[state=active]:text-warm-900 dark:data-[state=active]:text-cream-100 text-warm-600 dark:text-cream-400">
          Delta Report
        </TabsTrigger>
        <TabsTrigger value="changelog" className="data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900 data-[state=active]:text-warm-900 dark:data-[state=active]:text-cream-100 text-warm-600 dark:text-cream-400">
          Change Log
        </TabsTrigger>
        <TabsTrigger value="documents" className="data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900 data-[state=active]:text-warm-900 dark:data-[state=active]:text-cream-100 text-warm-600 dark:text-cream-400">
          Documents
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab — existing client detail content */}
      <TabsContent value="overview" className="space-y-6 mt-4">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Client Information — editable in place */}
          <EditableClientInfo client={client} />

          {/* Contacts Card */}
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">Contacts</CardTitle>
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
                <div className="text-center py-8 text-warm-500 dark:text-cream-400">
                  <User className="mx-auto h-12 w-12 mb-2 text-warm-400 dark:text-charcoal-600" />
                  <p>No contacts yet</p>
                  <ContactForm clientId={client.id}>
                    <Button variant="outline" size="sm" className="mt-4 rounded-sm border-warm-200 dark:border-charcoal-700 text-warm-700 dark:text-cream-300 hover:border-ocean-400">
                      Add First Contact
                    </Button>
                  </ContactForm>
                </div>
              ) : (
                <div className="space-y-3">
                  {client.contacts.map((contact: any) => (
                    <div
                      key={contact.id}
                      className="flex items-start justify-between p-3 border border-warm-200 dark:border-charcoal-700 rounded-sm hover:border-ocean-400 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-warm-900 dark:text-cream-100">
                            {contact.firstName} {contact.lastName}
                          </p>
                          <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 capitalize border-warm-300 dark:border-charcoal-700 text-warm-600 dark:text-cream-400">
                            {contact.role}
                          </Badge>
                          {contact.isPortalUser && (
                            <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-ocean-100 text-ocean-700 border-ocean-200">
                              Portal
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-warm-500 dark:text-cream-400">
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
                        <ContactForm clientId={client.id} contact={contact}>
                          <Button variant="ghost" size="sm" className="rounded-sm text-warm-600 dark:text-cream-400 hover:text-ocean-600 hover:bg-warm-50 dark:hover:bg-charcoal-800">
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

        {/* Locations Section */}
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">Locations</CardTitle>
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
              <div className="text-center py-12 text-warm-500 dark:text-cream-400">
                <MapPin className="mx-auto h-16 w-16 mb-4 text-warm-400 dark:text-charcoal-600" />
                <p className="text-lg font-medium mb-2 text-warm-700 dark:text-cream-300">No locations yet</p>
                <p className="text-sm mb-4">
                  Add locations for {client.name} to get started
                </p>
                <LocationForm clientId={client.id}>
                  <Button variant="outline" className="rounded-sm border-warm-200 dark:border-charcoal-700 text-warm-700 dark:text-cream-300 hover:border-ocean-400">
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Location
                  </Button>
                </LocationForm>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {client.locations.map((location: any) => (
                  <LocationCard key={location.id} location={location} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardHeader>
            <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-warm-500 dark:text-cream-400">Invoices</span>
              <span className="font-medium text-warm-900 dark:text-cream-100">{client._count.invoices}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-warm-500 dark:text-cream-400">Payments</span>
              <span className="font-medium text-warm-900 dark:text-cream-100">{client._count.payments}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-warm-500 dark:text-cream-400">Open Issues</span>
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
