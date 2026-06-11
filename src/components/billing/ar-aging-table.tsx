'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Inbox } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/empty-state'
import { SendReminderButton } from '@/components/billing/send-reminder-button'
import {
  agingChipVariant,
  agingDangerChipClass,
  agingTextClass,
  type AgingBucket,
} from '@/components/billing/aging'
import { formatMoneyExact } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ARagingTableProps {
  initialData: any
}

function TabCount({ count }: { count: number }) {
  return (
    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
      {count}
    </span>
  )
}

export function ARagingTable({ initialData }: ARagingTableProps) {
  const [selectedBucket, setSelectedBucket] = useState<string>('all')
  const [data, setData] = useState(initialData)

  const filteredInvoices =
    selectedBucket === 'all'
      ? data.invoices
      : data.invoices.filter(
          (inv: any) => inv.agingBucket === selectedBucket
        )

  const getBucketLabel = (bucket: string) => {
    switch (bucket) {
      case 'current':
        return 'Current (0-30 days)'
      case 'overdue_31_60':
        return '31-60 Days'
      case 'overdue_61_90':
        return '61-90 Days'
      case 'overdue_90_plus':
        return '90+ Days'
      default:
        return 'All'
    }
  }

  if (data.invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AR Aging Report</CardTitle>
          <CardDescription>No outstanding invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={CheckCircle2}
            title="All caught up — every invoice is paid"
            description="New unpaid invoices will land here grouped by how long they've been waiting."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AR Aging Report</CardTitle>
        <CardDescription>
          Outstanding invoices grouped by days past due
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedBucket} onValueChange={setSelectedBucket}>
          <TabsList>
            <TabsTrigger value="all">
              All <TabCount count={data.counts.total} />
            </TabsTrigger>
            <TabsTrigger value="current">
              Current <TabCount count={data.counts.current} />
            </TabsTrigger>
            <TabsTrigger value="overdue_31_60">
              31-60 <TabCount count={data.counts.overdue_31_60} />
            </TabsTrigger>
            <TabsTrigger value="overdue_61_90">
              61-90 <TabCount count={data.counts.overdue_61_90} />
            </TabsTrigger>
            <TabsTrigger value="overdue_90_plus">
              90+ <TabCount count={data.counts.overdue_90_plus} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedBucket} className="mt-4">
            {filteredInvoices.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Nothing in this bucket"
                description="No outstanding invoices have aged into this range."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Past Due</TableHead>
                    <TableHead className="text-right">Balance Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice: any) => {
                    const bucket = invoice.agingBucket as AgingBucket
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono tabular-nums font-medium text-foreground">
                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="transition-colors hover:text-primary"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {invoice.client.name}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums text-muted-foreground">
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {invoice.daysPastDue > 0 ? (
                            <span
                              className={cn(
                                'font-mono tabular-nums',
                                agingTextClass[bucket]
                              )}
                            >
                              {invoice.daysPastDue} days
                            </span>
                          ) : (
                            <span className="font-mono tabular-nums text-muted-foreground">
                              {Math.abs(invoice.daysPastDue)} days until due
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-foreground">
                          {formatMoneyExact(Number(invoice.balanceDue))}
                        </TableCell>
                        <TableCell>
                          {bucket === 'overdue_90_plus' ? (
                            <Badge className={agingDangerChipClass}>
                              {getBucketLabel(bucket)}
                            </Badge>
                          ) : (
                            <Badge variant={agingChipVariant[bucket]}>
                              {getBucketLabel(bucket)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/invoices/${invoice.id}`}>
                                View
                              </Link>
                            </Button>
                            {invoice.daysPastDue > 0 && (
                              <SendReminderButton invoiceId={invoice.id} />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
