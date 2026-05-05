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
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button'
import { ViewToggle, ViewMode } from '@/components/ui/view-toggle'
import { ClientCardGrid } from './client-card-grid'
import { formatCurrency, formatMargin, marginToneClass, type FinancialSummary } from '@/lib/financials'

interface ClientsListClientProps {
  clients: any[]
  showFinancials?: boolean
}

export function ClientsListClient({ clients, showFinancials = false }: ClientsListClientProps) {
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

  // Roll up financials across all clients so we can show a single header total.
  const portfolioTotals = showFinancials
    ? clients.reduce(
        (acc, c) => {
          const f: FinancialSummary | null = c.financials
          if (!f) return acc
          acc.revenue += f.monthlyRevenue
          acc.cost += f.monthlyCost
          acc.profit += f.monthlyProfit
          return acc
        },
        { revenue: 0, cost: 0, profit: 0 }
      )
    : null
  const portfolioMargin =
    portfolioTotals && portfolioTotals.revenue > 0
      ? (portfolioTotals.profit / portfolioTotals.revenue) * 100
      : null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900 dark:text-cream-100">Clients</h1>
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

      {showFinancials && portfolioTotals && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
            <CardContent className="p-4">
              <p className="text-xs text-warm-500 dark:text-cream-400 uppercase tracking-wider">Monthly Revenue</p>
              <p className="mt-1 text-2xl font-bold text-warm-900 dark:text-cream-100">
                {formatCurrency(portfolioTotals.revenue)}
              </p>
              <p className="mt-1 text-xs text-warm-500 dark:text-cream-400">
                {formatCurrency(portfolioTotals.revenue * 12)} annualized
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
            <CardContent className="p-4">
              <p className="text-xs text-warm-500 dark:text-cream-400 uppercase tracking-wider">Monthly Cost</p>
              <p className="mt-1 text-2xl font-bold text-warm-900 dark:text-cream-100">
                {formatCurrency(portfolioTotals.cost)}
              </p>
              <p className="mt-1 text-xs text-warm-500 dark:text-cream-400">labor + materials + other</p>
            </CardContent>
          </Card>
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
            <CardContent className="p-4">
              <p className="text-xs text-warm-500 dark:text-cream-400 uppercase tracking-wider">Monthly Profit</p>
              <p className={`mt-1 text-2xl font-bold ${marginToneClass(portfolioMargin)}`}>
                {formatCurrency(portfolioTotals.profit)}
              </p>
              <p className="mt-1 text-xs text-warm-500 dark:text-cream-400">across all clients</p>
            </CardContent>
          </Card>
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
            <CardContent className="p-4">
              <p className="text-xs text-warm-500 dark:text-cream-400 uppercase tracking-wider">Portfolio Margin</p>
              <p className={`mt-1 text-2xl font-bold ${marginToneClass(portfolioMargin)}`}>
                {formatMargin(portfolioMargin)}
              </p>
              <p className="mt-1 text-xs text-warm-500 dark:text-cream-400">weighted across all locations</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">All Clients</CardTitle>
              <CardDescription className="text-warm-500 dark:text-cream-400">
                {clients.length} {clients.length === 1 ? 'client' : 'clients'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'table' ? (
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
                {clients.map((client: any) => (
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
                      <Link
                        href={`/clients/${client.id}`}
                        className="hover:text-ocean-600 transition-colors"
                      >
                        {client.name}
                      </Link>
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
                    <TableCell className="text-warm-600 dark:text-cream-400">{client.locations.length}</TableCell>
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
            <ClientCardGrid clients={clients} showFinancials={showFinancials} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}


