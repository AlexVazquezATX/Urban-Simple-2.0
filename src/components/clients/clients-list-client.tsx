'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Building2, Lock, Plus, Search } from 'lucide-react'
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
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle'
import { EmptyState } from '@/components/ui/empty-state'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/layout/page-header'
import { FinancialKPIRow } from '@/components/shared/financial-kpi-row'
import { ClientCardGrid } from './client-card-grid'
import { ClientActionsMenu } from './client-actions-menu'
import { marginToneClass } from './margin-tone'
import { formatMargin, type FinancialsBandData } from '@/lib/financials'
import { formatMoney } from '@/lib/format'
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
      <Card>
        <CardContent>
          <EmptyState
            icon={Building2}
            title="No clients yet — your portfolio starts here"
            description="Add your first client to start tracking locations, billing, and service schedules."
            action={
              <ClientForm>
                <Button variant="gold">
                  <Plus className="size-4" />
                  Add Your First Client
                </Button>
              </ClientForm>
            }
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        className="mb-0"
        kicker="CLIENTS · PORTFOLIO"
        title="Clients"
        subtitle="Manage your clients and their locations"
        actions={
          <>
            <ViewToggle value={viewMode} onChange={handleViewChange} />
            <ClientForm>
              <Button variant="gold">
                <Plus className="size-4" />
                Add Client
              </Button>
            </ClientForm>
          </>
        }
      />

      {showFinancials && bandData ? (
        <div className="space-y-1.5">
          <FinancialKPIRow
            locationsServiced={locationsServiced}
            mrr={bandData.mrr}
            arr={bandData.arr}
            monthlyProfit={bandData.monthlyProfit}
            blendedMarginPct={bandData.blendedMarginPct}
          />
          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3 shrink-0" />
            Gross P&amp;L from service agreements · Portfolio. Overhead-inclusive net lives on
            the Financials dashboard.
          </p>
        </div>
      ) : (
        <StatCard
          label={locationsServiced === 1 ? 'Location serviced' : 'Locations serviced'}
          value={locationsServiced}
          icon={Building2}
          className="sm:max-w-[260px]"
        />
      )}

      {/* Search + status filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients by name or email…"
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44">
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Clients</CardTitle>
              <CardDescription>
                {displayClients.length}
                {isFiltering ? ` of ${clients.length}` : ''}{' '}
                {clients.length === 1 ? 'client' : 'clients'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {displayClients.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No clients match your search"
              description="Try a different name or email, or clear the status filter."
            />
          ) : viewMode === 'table' ? (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Client</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Billing Email</TableHead>
                  <TableHead>Locations</TableHead>
                  {showFinancials && (
                    <>
                      <TableHead className="text-right">MRR</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </>
                  )}
                  <TableHead>Status</TableHead>
                  <TableHead>Terms</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayClients.map((client: any) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium text-foreground">
                      <div
                        className={`flex items-center gap-2.5 ${client._isChild ? 'pl-4' : ''}`}
                      >
                        {client._isChild && (
                          <span className="text-muted-foreground" aria-hidden>
                            ↳
                          </span>
                        )}
                        {client.logoUrl ? (
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[9px] bg-secondary">
                            <Image
                              src={client.logoUrl}
                              alt={client.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-secondary">
                            <span className="text-xs font-medium text-muted-foreground">
                              {client.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <Link
                          href={`/clients/${client.id}`}
                          className="transition-colors hover:text-primary"
                        >
                          {client.name}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant="neutral">{client.branch.code}</Badge>
                        {client.parentClient && (
                          <Link href={`/clients/${client.parentClient.id}`}>
                            <Badge variant="neutral" className="hover:bg-secondary/70">
                              ↑ {client.parentClient.name}
                            </Badge>
                          </Link>
                        )}
                        {client._count?.childClients > 0 && (
                          <Badge variant="neutral">
                            {client._count.childClients}{' '}
                            {client._count.childClients === 1 ? 'child' : 'children'}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {client.billingEmail || <span aria-hidden>—</span>}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-foreground">
                      {client.locations.length}
                      {client._childLocationCount > 0 && (
                        <span className="ml-1 font-sans text-xs text-muted-foreground">
                          +{client._childLocationCount} in group
                        </span>
                      )}
                    </TableCell>
                    {showFinancials && (
                      <>
                        <TableCell className="text-right font-mono tabular-nums text-foreground">
                          {client.financials ? formatMoney(client.financials.monthlyRevenue) : '—'}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono tabular-nums ${client.financials ? marginToneClass(client.financials.marginPct) : 'text-muted-foreground'}`}
                        >
                          {client.financials ? formatMoney(client.financials.monthlyProfit) : '—'}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono tabular-nums ${client.financials ? marginToneClass(client.financials.marginPct) : 'text-muted-foreground'}`}
                        >
                          {client.financials ? formatMargin(client.financials.marginPct) : '—'}
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <Badge variant={client.status === 'active' ? 'green' : 'neutral'}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="neutral">{client.paymentTerms}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/clients/${client.id}`}>View</Link>
                        </Button>
                        <ClientActionsMenu
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
