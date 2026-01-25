'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClientForm } from '@/components/forms/client-form'
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle'
import { ClientCardGrid } from './client-card-grid'

interface ClientsListClientProps {
  clients: any[]
}

export function ClientsListClient({ clients }: ClientsListClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  // Load view preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('clients-view-mode') as ViewMode
    if (saved && (saved === 'table' || saved === 'card')) {
      setViewMode(saved)
    }
  }, [])

  // Save view preference to localStorage
  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('clients-view-mode', mode)
  }

  if (clients.length === 0) {
    return (
      <Card className="rounded-sm border-warm-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-warm-500 mb-4">No clients yet</p>
          <ClientForm>
            <Button variant="lime" className="rounded-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Client
            </Button>
          </ClientForm>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900">Clients</h1>
          <p className="text-sm text-warm-500">
            Manage your clients and their locations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle value={viewMode} onChange={handleViewChange} />
          <ClientForm>
            <Button variant="lime" className="rounded-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </ClientForm>
        </div>
      </div>

      <Card className="rounded-sm border-warm-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display font-medium text-warm-900">All Clients</CardTitle>
              <CardDescription className="text-warm-500">
                {clients.length} {clients.length === 1 ? 'client' : 'clients'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'table' ? (
            <Table>
              <TableHeader>
                <TableRow className="border-warm-200 hover:bg-transparent">
                  <TableHead className="w-16 text-xs font-medium text-warm-500 uppercase tracking-wider">Logo</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Branch</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Billing Email</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Locations</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Payment Terms</TableHead>
                  <TableHead className="text-right text-xs font-medium text-warm-500 uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client: any) => (
                  <TableRow key={client.id} className="border-warm-200 hover:bg-warm-50">
                    <TableCell>
                      {client.logoUrl ? (
                        <div className="relative h-10 w-10 rounded-sm overflow-hidden bg-warm-100">
                          <Image
                            src={client.logoUrl}
                            alt={client.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-sm bg-warm-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-warm-500">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-warm-900">
                      <Link
                        href={`/clients/${client.id}`}
                        className="hover:text-ocean-600 transition-colors"
                      >
                        {client.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300 text-warm-600">{client.branch.code}</Badge>
                    </TableCell>
                    <TableCell className="text-warm-600">{client.billingEmail || '-'}</TableCell>
                    <TableCell className="text-warm-600">{client.locations.length}</TableCell>
                    <TableCell>
                      <Badge
                        variant={client.status === 'active' ? 'default' : 'secondary'}
                        className={`rounded-sm text-[10px] px-1.5 py-0 ${
                          client.status === 'active'
                            ? 'bg-lime-100 text-lime-700 border-lime-200'
                            : 'bg-warm-100 text-warm-600 border-warm-200'
                        }`}
                      >
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-warm-600">{client.paymentTerms}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/clients/${client.id}`}>
                        <Button variant="ghost" size="sm" className="rounded-sm text-warm-600 hover:text-ocean-600 hover:bg-warm-50">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <ClientCardGrid clients={clients} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}


