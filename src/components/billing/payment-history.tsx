'use client'

import Link from 'next/link'
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

interface PaymentHistoryProps {
  payments: any[]
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <Card className="rounded-sm border-warm-200">
        <CardHeader>
          <CardTitle className="font-display font-medium text-warm-900">Payment History</CardTitle>
          <CardDescription className="text-warm-500">No payments recorded yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-warm-500 text-center py-8">
            Payments will appear here once recorded
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-sm border-warm-200">
      <CardHeader>
        <CardTitle className="font-display font-medium text-warm-900">Payment History</CardTitle>
        <CardDescription className="text-warm-500">
          {payments.length} {payments.length === 1 ? 'payment' : 'payments'} recorded
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-warm-200 hover:bg-transparent">
              <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Date</TableHead>
              <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Amount</TableHead>
              <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Method</TableHead>
              <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Reference</TableHead>
              <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Invoice</TableHead>
              <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id} className="border-warm-200 hover:bg-warm-50">
                <TableCell className="text-warm-600">
                  {new Date(payment.paymentDate).toLocaleDateString()}
                </TableCell>
                <TableCell className="font-medium text-warm-900">
                  ${Number(payment.amount).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
                <TableCell className="capitalize text-warm-600">
                  {payment.paymentMethod.replace('_', ' ')}
                </TableCell>
                <TableCell className="text-warm-500">
                  {payment.referenceNumber || '-'}
                </TableCell>
                <TableCell>
                  {payment.invoice ? (
                    <Link
                      href={`/app/invoices/${payment.invoice.id}`}
                      className="text-warm-900 hover:text-ocean-600 transition-colors"
                    >
                      {payment.invoice.invoiceNumber}
                    </Link>
                  ) : (
                    <span className="text-warm-500">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    className={`rounded-sm text-[10px] px-1.5 py-0 ${
                      payment.status === 'completed'
                        ? 'bg-lime-100 text-lime-700 border-lime-200'
                        : payment.status === 'failed'
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : 'bg-warm-100 text-warm-600 border-warm-200'
                    }`}
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




