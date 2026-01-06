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
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">No clients yet</p>
          <ClientForm>
            <Button>
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
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground">
            Manage your clients and their locations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle value={viewMode} onChange={handleViewChange} />
          <ClientForm>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </ClientForm>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Clients</CardTitle>
              <CardDescription>
                {clients.length} {clients.length === 1 ? 'client' : 'clients'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'table' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Logo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Billing Email</TableHead>
                  <TableHead>Locations</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Terms</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client: any) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      {client.logoUrl ? (
                        <div className="relative h-10 w-10 rounded overflow-hidden bg-muted">
                          <Image
                            src={client.logoUrl}
                            alt={client.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <span className="text-xs font-medium text-muted-foreground">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/clients/${client.id}`}
                        className="hover:underline"
                      >
                        {client.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{client.branch.code}</Badge>
                    </TableCell>
                    <TableCell>{client.billingEmail || '-'}</TableCell>
                    <TableCell>{client.locations.length}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          client.status === 'active' ? 'default' : 'secondary'
                        }
                      >
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{client.paymentTerms}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/clients/${client.id}`}>
                        <Button variant="ghost" size="sm">
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


