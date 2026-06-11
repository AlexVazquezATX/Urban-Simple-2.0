'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { ARagingTable } from '@/components/billing/ar-aging-table'
import { Clock, AlertTriangle, DollarSign, FileText, ScrollText } from 'lucide-react'
import Link from 'next/link'
import { formatMoneyExact } from '@/lib/format'

interface MoneyTabsProps {
  arData: {
    invoices: any[]
    totals: { current: number; overdue_31_60: number; overdue_61_90: number; overdue_90_plus: number; total: number }
    counts: { current: number; overdue_31_60: number; overdue_61_90: number; overdue_90_plus: number; total: number }
  }
  allInvoices: any[]
  agreements: any[]
  invoiceSummary: { totalOutstanding: number; totalOverdue: number; overdueCount: number }
}

// Invoice status → chip tone. Paid is success, sent is informational,
// overdue is attention; everything else stays neutral.
function invoiceStatusVariant(status: string): 'green' | 'teal' | 'coral' | 'neutral' {
  if (status === 'paid') return 'green'
  if (status === 'sent') return 'teal'
  if (status === 'overdue') return 'coral'
  return 'neutral'
}

// Title-case the raw status so chips read "Paid"/"Sent" like every other
// chip, instead of the lowercase enum value.
function invoiceStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function MoneyTabs({ arData, allInvoices, agreements, invoiceSummary }: MoneyTabsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get('tab') || 'overview'
  const [activeTab, setActiveTab] = useState(tabParam)

  useEffect(() => {
    if (tabParam) setActiveTab(tabParam)
  }, [tabParam])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.push(`/money?tab=${value}`, { scroll: false })
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview" className="gap-1.5">
          <DollarSign className="h-3.5 w-3.5" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="invoices" className="gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          Invoices
        </TabsTrigger>
        <TabsTrigger value="agreements" className="gap-1.5">
          <ScrollText className="h-3.5 w-3.5" />
          Agreements
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-0 space-y-6">
        {/* AR aging ramp: teal (current) → gold (1-2mo) → coral (2-3mo) →
            danger red (3+mo — the ONE approved red outside confirm dialogs). */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="On time (0-30d)"
            icon={Clock}
            tone="teal"
            value={formatMoneyExact(arData.totals.current)}
            sub={`${arData.counts.current} invoices`}
          />
          <StatCard
            label="1-2 months"
            icon={AlertTriangle}
            tone="gold"
            value={formatMoneyExact(arData.totals.overdue_31_60)}
            sub={`${arData.counts.overdue_31_60} invoices`}
          />
          <StatCard
            label="2-3 months"
            icon={AlertTriangle}
            tone="coral"
            value={formatMoneyExact(arData.totals.overdue_61_90)}
            sub={`${arData.counts.overdue_61_90} invoices`}
          />
          <StatCard
            label="3+ months"
            icon={AlertTriangle}
            value={
              <span className="text-destructive">
                {formatMoneyExact(arData.totals.overdue_90_plus)}
              </span>
            }
            sub={`${arData.counts.overdue_90_plus} invoices`}
          />
        </div>

        {/* Total Outstanding */}
        <Card>
          <CardHeader>
            <CardTitle>Total Outstanding</CardTitle>
            <CardDescription>All unpaid invoices across all aging buckets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="font-display text-4xl font-bold tracking-[-1px] tabular-nums text-foreground">
              {formatMoneyExact(arData.totals.total)}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {arData.counts.total} invoices outstanding
            </p>
          </CardContent>
        </Card>

        <ARagingTable initialData={arData} />
      </TabsContent>

      <TabsContent value="invoices" className="mt-0 space-y-4">
        {/* Invoice summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total invoices" value={allInvoices.length} />
          <StatCard
            label="Outstanding"
            value={formatMoneyExact(invoiceSummary.totalOutstanding)}
          />
          <StatCard
            label="Overdue"
            tone="coral"
            value={formatMoneyExact(invoiceSummary.totalOverdue)}
            sub={`${invoiceSummary.overdueCount} invoices`}
          />
        </div>

        {/* Invoice List */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="kicker p-3 text-left font-normal text-muted-foreground">Invoice #</th>
                    <th className="kicker p-3 text-left font-normal text-muted-foreground">Client</th>
                    <th className="kicker p-3 text-left font-normal text-muted-foreground">Date</th>
                    <th className="kicker p-3 text-right font-normal text-muted-foreground">Amount</th>
                    <th className="kicker p-3 text-right font-normal text-muted-foreground">Balance</th>
                    <th className="kicker p-3 text-center font-normal text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allInvoices.map((inv) => (
                    <tr key={inv.id} className="h-[52px] border-b border-border/60 transition-colors hover:bg-secondary/50">
                      <td className="p-3">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-medium text-teal-600 hover:underline dark:text-teal-300"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="p-3 text-foreground">{inv.clientName}</td>
                      <td className="p-3 font-mono tabular-nums text-muted-foreground">
                        {new Date(inv.issueDate).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-foreground">
                        {formatMoneyExact(Number(inv.totalAmount))}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-foreground">
                        {formatMoneyExact(Number(inv.balanceDue))}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={invoiceStatusVariant(inv.status)}>{invoiceStatusLabel(inv.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                  {allInvoices.length === 0 && (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState
                          icon={FileText}
                          title="No invoices yet"
                          description="Invoices show up here as soon as the first one is generated."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="agreements" className="mt-0 space-y-4">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="kicker p-3 text-left font-normal text-muted-foreground">Client</th>
                    <th className="kicker p-3 text-left font-normal text-muted-foreground">Location</th>
                    <th className="kicker p-3 text-right font-normal text-muted-foreground">Monthly Amount</th>
                    <th className="kicker p-3 text-left font-normal text-muted-foreground">Payment Terms</th>
                    <th className="kicker p-3 text-center font-normal text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {agreements.map((sa) => (
                    <tr key={sa.id} className="h-[52px] border-b border-border/60 transition-colors hover:bg-secondary/50">
                      <td className="p-3 font-medium text-foreground">{sa.clientName}</td>
                      <td className="p-3 text-muted-foreground">{sa.locationName}</td>
                      <td className="p-3 text-right font-mono tabular-nums text-foreground">
                        {formatMoneyExact(Number(sa.monthlyAmount))}
                      </td>
                      <td className="p-3 text-muted-foreground">{sa.paymentTerms}</td>
                      <td className="p-3 text-center">
                        <Badge variant={sa.isActive ? 'green' : 'neutral'}>
                          {sa.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {agreements.length === 0 && (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState
                          icon={ScrollText}
                          title="No service agreements yet"
                          description="Active agreements appear here once a client is set up with recurring billing."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
