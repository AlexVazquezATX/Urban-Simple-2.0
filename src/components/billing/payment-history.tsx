'use client'

import Link from 'next/link'
import { Banknote } from 'lucide-react'
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
import { EmptyState } from '@/components/ui/empty-state'
import { formatMoneyExact } from '@/lib/format'

interface PaymentHistoryProps {
  payments: any[]
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>No payments recorded yet</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Banknote}
            title="No payments yet"
            description="Payments will appear here as soon as one is recorded."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
        <CardDescription>
          {payments.length} {payments.length === 1 ? 'payment' : 'payments'} recorded
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-mono tabular-nums text-muted-foreground">
                  {new Date(payment.paymentDate).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-foreground">
                  {formatMoneyExact(Number(payment.amount))}
                </TableCell>
                <TableCell className="capitalize text-muted-foreground">
                  {payment.paymentMethod.replace('_', ' ')}
                </TableCell>
                <TableCell className="font-mono tabular-nums text-muted-foreground">
                  {payment.referenceNumber || '—'}
                </TableCell>
                <TableCell>
                  {payment.invoice ? (
                    <Link
                      href={`/invoices/${payment.invoice.id}`}
                      className="font-mono tabular-nums text-foreground transition-colors hover:text-primary"
                    >
                      {payment.invoice.invoiceNumber}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      payment.status === 'completed'
                        ? 'green'
                        : payment.status === 'failed'
                          ? 'coral'
                          : 'neutral'
                    }
                  >
                    {payment.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
