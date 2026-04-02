'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ARagingTable } from '@/components/billing/ar-aging-table'
import { Clock, AlertTriangle, DollarSign, FileText, ScrollText } from 'lucide-react'
import Link from 'next/link'

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
      <TabsList className="bg-warm-100 dark:bg-charcoal-800 border border-warm-200 dark:border-charcoal-700">
        <TabsTrigger value="overview" className="gap-1.5 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900">
          <DollarSign className="h-3.5 w-3.5" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="invoices" className="gap-1.5 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900">
          <FileText className="h-3.5 w-3.5" />
          Invoices
        </TabsTrigger>
        <TabsTrigger value="agreements" className="gap-1.5 text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-charcoal-900">
          <ScrollText className="h-3.5 w-3.5" />
          Agreements
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-0 space-y-6">
        {/* AR Aging Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900 border-l-4 border-l-ocean-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-warm-700 dark:text-cream-300">On Time (0-30d)</CardTitle>
              <Clock className="h-4 w-4 text-ocean-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-medium text-ocean-700 dark:text-ocean-400">
                ${arData.totals.current.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-warm-500 dark:text-cream-400">{arData.counts.current} invoices</p>
            </CardContent>
          </Card>

          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-warm-700 dark:text-cream-300">1-2 Months</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-medium text-yellow-600 dark:text-yellow-400">
                ${arData.totals.overdue_31_60.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-warm-500 dark:text-cream-400">{arData.counts.overdue_31_60} invoices</p>
            </CardContent>
          </Card>

          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-warm-700 dark:text-cream-300">2-3 Months</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-medium text-orange-600 dark:text-orange-400">
                ${arData.totals.overdue_61_90.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-warm-500 dark:text-cream-400">{arData.counts.overdue_61_90} invoices</p>
            </CardContent>
          </Card>

          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-warm-700 dark:text-cream-300">3+ Months</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-display font-medium text-red-600 dark:text-red-400">
                ${arData.totals.overdue_90_plus.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-warm-500 dark:text-cream-400">{arData.counts.overdue_90_plus} invoices</p>
            </CardContent>
          </Card>
        </div>

        {/* Total Outstanding */}
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900">
          <CardHeader>
            <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">Total Outstanding</CardTitle>
            <CardDescription className="text-warm-500 dark:text-cream-400">All unpaid invoices across all aging buckets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-display font-medium text-warm-900 dark:text-cream-100">
              ${arData.totals.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-sm text-warm-500 dark:text-cream-400 mt-2">{arData.counts.total} invoices outstanding</p>
          </CardContent>
        </Card>

        <ARagingTable initialData={arData} />
      </TabsContent>

      <TabsContent value="invoices" className="mt-0 space-y-4">
        {/* Invoice Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-warm-500 dark:text-cream-400">Total Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-warm-900 dark:text-cream-100">{allInvoices.length}</div>
            </CardContent>
          </Card>
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-warm-500 dark:text-cream-400">Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-warm-900 dark:text-cream-100">
                ${invoiceSummary.totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-warm-500 dark:text-cream-400">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-destructive">
                ${invoiceSummary.totalOverdue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                <span className="text-sm font-normal text-warm-500 dark:text-cream-400 ml-2">({invoiceSummary.overdueCount} invoices)</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice List */}
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-200 dark:border-charcoal-700 bg-warm-50 dark:bg-charcoal-800">
                    <th className="text-left p-3 font-medium text-warm-600 dark:text-cream-300">Invoice #</th>
                    <th className="text-left p-3 font-medium text-warm-600 dark:text-cream-300">Client</th>
                    <th className="text-left p-3 font-medium text-warm-600 dark:text-cream-300">Date</th>
                    <th className="text-right p-3 font-medium text-warm-600 dark:text-cream-300">Amount</th>
                    <th className="text-right p-3 font-medium text-warm-600 dark:text-cream-300">Balance</th>
                    <th className="text-center p-3 font-medium text-warm-600 dark:text-cream-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-warm-100 dark:border-charcoal-800 hover:bg-warm-50/50 dark:hover:bg-charcoal-800/50">
                      <td className="p-3">
                        <Link href={`/invoices/${inv.id}`} className="text-ocean-600 dark:text-ocean-400 hover:underline font-medium">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="p-3 text-warm-700 dark:text-cream-300">{inv.clientName}</td>
                      <td className="p-3 text-warm-500 dark:text-cream-400">{new Date(inv.issueDate).toLocaleDateString()}</td>
                      <td className="p-3 text-right text-warm-700 dark:text-cream-300">${Number(inv.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right text-warm-700 dark:text-cream-300">${Number(inv.balanceDue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-center">
                        <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'sent' ? 'secondary' : 'outline'} className="text-xs">
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {allInvoices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-warm-400 dark:text-cream-500">No invoices found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="agreements" className="mt-0 space-y-4">
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-warm-200 dark:border-charcoal-700 bg-warm-50 dark:bg-charcoal-800">
                    <th className="text-left p-3 font-medium text-warm-600 dark:text-cream-300">Client</th>
                    <th className="text-left p-3 font-medium text-warm-600 dark:text-cream-300">Location</th>
                    <th className="text-right p-3 font-medium text-warm-600 dark:text-cream-300">Monthly Amount</th>
                    <th className="text-left p-3 font-medium text-warm-600 dark:text-cream-300">Payment Terms</th>
                    <th className="text-center p-3 font-medium text-warm-600 dark:text-cream-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {agreements.map((sa) => (
                    <tr key={sa.id} className="border-b border-warm-100 dark:border-charcoal-800 hover:bg-warm-50/50 dark:hover:bg-charcoal-800/50">
                      <td className="p-3 text-warm-700 dark:text-cream-300 font-medium">{sa.clientName}</td>
                      <td className="p-3 text-warm-600 dark:text-cream-400">{sa.locationName}</td>
                      <td className="p-3 text-right text-warm-700 dark:text-cream-300">${Number(sa.monthlyAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-warm-500 dark:text-cream-400">{sa.paymentTerms}</td>
                      <td className="p-3 text-center">
                        <Badge variant={sa.isActive ? 'default' : 'secondary'} className="text-xs">
                          {sa.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {agreements.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-warm-400 dark:text-cream-500">No service agreements found</td>
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
