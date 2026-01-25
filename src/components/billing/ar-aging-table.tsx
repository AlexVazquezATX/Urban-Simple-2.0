'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail } from 'lucide-react'
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
import { SendReminderButton } from '@/components/billing/send-reminder-button'

interface ARagingTableProps {
  initialData: any
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

  const getBucketColor = (bucket: string) => {
    switch (bucket) {
      case 'current':
        return 'default'
      case 'overdue_31_60':
        return 'secondary'
      case 'overdue_61_90':
        return 'outline'
      case 'overdue_90_plus':
        return 'destructive'
      default:
        return 'default'
    }
  }

  if (data.invoices.length === 0) {
    return (
      <Card className="rounded-sm border-warm-200">
        <CardHeader>
          <CardTitle className="font-display font-medium text-warm-900">AR Aging Report</CardTitle>
          <CardDescription className="text-warm-500">No outstanding invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-warm-500 text-center py-8">
            All invoices are paid up!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-sm border-warm-200">
      <CardHeader>
        <CardTitle className="font-display font-medium text-warm-900">AR Aging Report</CardTitle>
        <CardDescription className="text-warm-500">
          Outstanding invoices grouped by days past due
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedBucket} onValueChange={setSelectedBucket}>
          <TabsList className="grid w-full grid-cols-5 rounded-sm">
            <TabsTrigger value="all" className="rounded-sm text-xs">All</TabsTrigger>
            <TabsTrigger value="current" className="rounded-sm text-xs">Current</TabsTrigger>
            <TabsTrigger value="overdue_31_60" className="rounded-sm text-xs">31-60</TabsTrigger>
            <TabsTrigger value="overdue_61_90" className="rounded-sm text-xs">61-90</TabsTrigger>
            <TabsTrigger value="overdue_90_plus" className="rounded-sm text-xs">90+</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedBucket} className="mt-4">
            {filteredInvoices.length === 0 ? (
              <p className="text-center py-8 text-warm-500">
                No invoices in this bucket
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-warm-200 hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Invoice #</TableHead>
                    <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Client</TableHead>
                    <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Due Date</TableHead>
                    <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Days Past Due</TableHead>
                    <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Balance Due</TableHead>
                    <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-right text-xs font-medium text-warm-500 uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice: any) => (
                    <TableRow key={invoice.id} className="border-warm-200 hover:bg-warm-50">
                      <TableCell className="font-medium text-warm-900">
                        <Link
                          href={`/app/invoices/${invoice.id}`}
                          className="hover:text-ocean-600 transition-colors"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-warm-600">{invoice.client.name}</TableCell>
                      <TableCell className="text-warm-600">
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {invoice.daysPastDue > 0 ? (
                          <span className="text-red-600">
                            {invoice.daysPastDue} days
                          </span>
                        ) : (
                          <span className="text-warm-500">
                            {Math.abs(invoice.daysPastDue)} days until due
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-warm-900 font-medium">
                        ${Number(invoice.balanceDue).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`rounded-sm text-[10px] px-1.5 py-0 ${
                            invoice.agingBucket === 'current'
                              ? 'bg-ocean-100 text-ocean-700 border-ocean-200'
                              : invoice.agingBucket === 'overdue_31_60'
                                ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                : invoice.agingBucket === 'overdue_61_90'
                                  ? 'bg-orange-100 text-orange-700 border-orange-200'
                                  : 'bg-red-100 text-red-700 border-red-200'
                          }`}
                        >
                          {getBucketLabel(invoice.agingBucket)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/app/invoices/${invoice.id}`}>
                            <Button variant="ghost" size="sm" className="rounded-sm text-warm-600 hover:text-ocean-600 hover:bg-warm-50">
                              View
                            </Button>
                          </Link>
                          {invoice.daysPastDue > 0 && (
                            <SendReminderButton invoiceId={invoice.id} />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}




