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
      <Card>
        <CardHeader>
          <CardTitle>AR Aging Report</CardTitle>
          <CardDescription>No outstanding invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            All invoices are paid up!
          </p>
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="current">Current</TabsTrigger>
            <TabsTrigger value="overdue_31_60">31-60</TabsTrigger>
            <TabsTrigger value="overdue_61_90">61-90</TabsTrigger>
            <TabsTrigger value="overdue_90_plus">90+</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedBucket} className="mt-4">
            {filteredInvoices.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No invoices in this bucket
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Days Past Due</TableHead>
                    <TableHead>Balance Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/app/invoices/${invoice.id}`}
                          className="hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{invoice.client.name}</TableCell>
                      <TableCell>
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {invoice.daysPastDue > 0 ? (
                          <span className="text-destructive">
                            {invoice.daysPastDue} days
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {Math.abs(invoice.daysPastDue)} days until due
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        ${Number(invoice.balanceDue).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getBucketColor(invoice.agingBucket)}>
                          {getBucketLabel(invoice.agingBucket)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/app/invoices/${invoice.id}`}>
                            <Button variant="ghost" size="sm">
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

