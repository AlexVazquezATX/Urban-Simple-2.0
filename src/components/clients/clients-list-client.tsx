'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ClientForm } from '@/components/forms/client-form'
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button'
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle'
import { ClientCardGrid } from './client-card-grid'
import { FinancialsSummaryBand } from '@/components/financials/financials-summary-band'
import { formatCurrency, formatMargin, marginToneClass, type FinancialsBandData } from '@/lib/financials'
import { persistViewMode } from '@/lib/view-mode'

interface ClientsListClientProps {
  clients: any[]
  showFinancials?: boolean
  initialViewMode: ViewMode
  bandData: FinancialsBandData | null
  locationsServiced: number
}

export function ClientsListClient({
  clients,
  showFinancials = false,
  initialViewMode,
  bandData,
  locationsServiced,
}: ClientsListClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode)
    persistViewMode('clients-view-mode', mode)
  }

  // Child-location rollup keyed by parent id — computed from the full list so
  // it stays accurate even while the visible list is filtered.
  const childLocationCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of clients) {
      if (c.parentClientId) {
        map.set(
          c.parentClientId,
          (map.get(c.parentClientId) ?? 0) + (c.locations?.length ?? 0)
        )
      }
    }
    return map
  }, [clients])

  const isFiltering = query.trim() !== '' || status !== 'all'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return clients.filter((c) => {
      if (status !== 'all' && c.status !== status) return false
      if (!q) return true
      return (
        c.name?.toLowerCase().includes(q) ||
        c.legalName?.toLowerCase().includes(q) ||
        c.billingEmail?.toLowerCase().includes(q)
      )
    })
  }, [clients, query, status])

  // When not filtering, order each parent immediately before its children so
  // the hierarchy reads top-to-bottom. When filtering, keep results flat.
  const displayClients = useMemo(() => {
    const decorate = (c: any, isChild: boolean) => ({
      ...c,
      _isChild: isChild,
      _childLocationCount: childLocationCount.get(c.id) ?? 0,
    })

    if (isFiltering) {
      return filtered.map((c) => decorate(c, false))
    }

    const childrenByParent = new Map<string, any[]>()
    const topLevel: any[] = []
    for (const c of filtered) {
      if (c.parentClientId) {
        const list = childrenByParent.get(c.parentClientId) ?? []
        list.push(c)
        childrenByParent.set(c.parentClientId, list)
      } else {
        topLevel.push(c)
      }
    }

    const ordered: any[] = []
    const placed = new Set<string>()
    for (const parent of topLevel) {
      ordered.push(decorate(parent, false))
      placed.add(parent.id)
      for (const child of childrenByParent.get(parent.id) ?? []) {
        ordered.push(decorate(child, true))
        placed.add(child.id)
      }
    }
    // Orphans: a child whose parent sits outside this list (e.g. other branch).
    for (const c of filtered) {
      if (!placed.has(c.id)) ordered.push(decorate(c, false))
    }
    return ordered
  }, [filtered, isFiltering, childLocationCount])

  // No clients at all — first-run empty state.
  if (clients.length === 0) {
    return (
      <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-warm-500 dark:text-cream-400 mb-4">No clients yet</p>
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
          <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900 dark:text-cream-100">
            Clients
          </h1>
          <p className="text-sm text-warm-500 dark:text-cream-400">
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

      <FinancialsSummaryBand
        variant={showFinancials ? 'admin' : 'plain'}
        locationsServiced={locationsServiced}
        data={bandData}
        scopeLabel="Portfolio"
      />

      {/* Search + status filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-400 dark:text-cream-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients by name or email…"
            className="rounded-sm pl-8"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full rounded-sm sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="churned">Churned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">
                All Clients
              </CardTitle>
              <CardDescription className="text-warm-500 dark:text-cream-400">
                {displayClients.length}
                {isFiltering ? ` of ${clients.length}` : ''}{' '}
                {clients.length === 1 ? 'client' : 'clients'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {displayClients.length === 0 ? (
            <div className="py-12 text-center text-warm-500 dark:text-cream-400">
              No clients match your search.
            </div>
          ) : viewMode === 'table' ? (
            <Table>
              <TableHeader>
                <TableRow className="border-warm-200 dark:border-charcoal-700 hover:bg-transparent">
                  <TableHead className="w-16 text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Logo</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Branch</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Billing Email</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Locations</TableHead>
                  {showFinancials && (
                    <>
                      <TableHead className="text-right text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">MRR</TableHead>
                      <TableHead className="text-right text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Profit</TableHead>
                      <TableHead className="text-right text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Margin</TableHead>
                    </>
                  )}
                  <TableHead className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Payment Terms</TableHead>
                  <TableHead className="text-right text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wider">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayClients.map((client: any) => (
                  <TableRow key={client.id} className="border-warm-200 dark:border-charcoal-700 hover:bg-warm-50 dark:hover:bg-charcoal-800">
                    <TableCell>
                      {client.logoUrl ? (
                        <div className="relative h-10 w-10 rounded-sm overflow-hidden bg-warm-100 dark:bg-charcoal-800">
                          <Image
                            src={client.logoUrl}
                            alt={client.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-sm bg-warm-100 dark:bg-charcoal-800 flex items-center justify-center">
                          <span className="text-xs font-medium text-warm-500 dark:text-cream-400">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-warm-900 dark:text-cream-100">
                      <div className={client._isChild ? 'flex items-center gap-1.5 pl-4' : ''}>
                        {client._isChild && (
                          <span className="text-plum-400" aria-hidden>↳</span>
                        )}
                        <Link
                          href={`/clients/${client.id}`}
                          className="hover:text-ocean-600 transition-colors"
                        >
                          {client.name}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300 dark:border-charcoal-700 text-warm-600 dark:text-cream-400">{client.branch.code}</Badge>
                        {client.parentClient && (
                          <Link href={`/clients/${client.parentClient.id}`}>
                            <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-plum-200 text-plum-600 hover:bg-plum-50 dark:hover:bg-plum-950/30">
                              ↑ {client.parentClient.name}
                            </Badge>
                          </Link>
                        )}
                        {client._count?.childClients > 0 && (
                          <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-plum-100 text-plum-700 border-plum-200">
                            {client._count.childClients} {client._count.childClients === 1 ? 'child' : 'children'}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-warm-600 dark:text-cream-400">{client.billingEmail || '-'}</TableCell>
                    <TableCell className="text-warm-600 dark:text-cream-400">
                      {client.locations.length}
                      {client._childLocationCount > 0 && (
                        <span className="ml-1 text-xs text-plum-600">
                          +{client._childLocationCount} in group
                        </span>
                      )}
                    </TableCell>
                    {showFinancials && (
                      <>
                        <TableCell className="text-right font-mono text-warm-700 dark:text-cream-300">
                          {client.financials ? formatCurrency(client.financials.monthlyRevenue) : '—'}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${client.financials ? marginToneClass(client.financials.marginPct) : ''}`}>
                          {client.financials ? formatCurrency(client.financials.monthlyProfit) : '—'}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${client.financials ? marginToneClass(client.financials.marginPct) : ''}`}>
                          {client.financials ? formatMargin(client.financials.marginPct) : '—'}
                        </TableCell>
                      </>
                    )}
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
                    <TableCell className="text-warm-600 dark:text-cream-400">{client.paymentTerms}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/clients/${client.id}`}>
                          <Button variant="ghost" size="sm" className="rounded-sm text-warm-600 dark:text-cream-400 hover:text-ocean-600 hover:bg-warm-50 dark:hover:bg-charcoal-800">
                            View
                          </Button>
                        </Link>
                        <ConfirmDeleteButton
                          endpoint={`/api/clients/${client.id}`}
                          entityLabel={client.name}
                          entityKind="client"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <ClientCardGrid clients={displayClients} showFinancials={showFinancials} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
