import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MarkAsSentButton } from '@/components/invoice-actions'
import { PaymentForm } from '@/components/forms/payment-form'
import { PaymentHistory } from '@/components/billing/payment-history'
import { QBSyncButton } from '@/components/billing/qb-sync-button'
import { getApiUrl } from '@/lib/api'

async function InvoiceDetail({ id }: { id: string }) {
  const response = await fetch(getApiUrl(`/api/invoices/${id}`), {
    cache: 'no-store',
  })

  if (!response.ok) {
    return (
      <div className="text-destructive">
        Failed to load invoice. Please try again.
      </div>
    )
  }

  const invoice = await response.json()

  const dueDate = new Date(invoice.dueDate)
  const isOverdue =
    (invoice.status === 'sent' || invoice.status === 'partial') &&
    dueDate < new Date() &&
    Number(invoice.balanceDue) > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/app/invoices">
            <Button variant="ghost" size="icon" className="rounded-sm text-warm-600 hover:text-ocean-600 hover:bg-warm-50">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900">{invoice.invoiceNumber}</h1>
            <p className="text-sm text-warm-500">
              {invoice.client.name} •{' '}
              {new Date(invoice.issueDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={`rounded-sm text-sm px-2.5 py-0.5 ${
              invoice.status === 'paid'
                ? 'bg-lime-100 text-lime-700 border-lime-200'
                : invoice.status === 'draft'
                  ? 'bg-warm-100 text-warm-600 border-warm-200'
                  : isOverdue
                    ? 'bg-red-100 text-red-700 border-red-200'
                    : 'bg-ocean-100 text-ocean-700 border-ocean-200'
            }`}
          >
            {invoice.status === 'sent' && isOverdue
              ? 'Overdue'
              : invoice.status}
          </Badge>
          {invoice.status === 'draft' && (
            <MarkAsSentButton invoiceId={invoice.id} />
          )}
          {Number(invoice.balanceDue) > 0 && (
            <PaymentForm
              clientId={invoice.clientId}
              invoiceId={invoice.id}
              invoiceBalance={Number(invoice.balanceDue)}
            >
              <Button variant="lime" size="sm" className="rounded-sm">
                <DollarSign className="mr-2 h-4 w-4" />
                Record Payment
              </Button>
            </PaymentForm>
          )}
          <QBSyncButton
            invoiceId={invoice.id}
            qbInvoiceId={invoice.qbInvoiceId}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-sm border-warm-200">
          <CardHeader>
            <CardTitle className="font-display font-medium text-warm-900">Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-warm-500">Issue Date</p>
              <p className="font-medium text-warm-900">
                {new Date(invoice.issueDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-warm-500">Due Date</p>
              <p
                className={`font-medium ${isOverdue ? 'text-red-600' : 'text-warm-900'}`}
              >
                {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
            </div>
            {invoice.sentAt && (
              <div>
                <p className="text-sm text-warm-500">Sent At</p>
                <p className="font-medium text-warm-900">
                  {new Date(invoice.sentAt).toLocaleDateString()}
                </p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-sm text-warm-500">Payment Terms</p>
                <p className="font-medium text-warm-900">{invoice.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-sm border-warm-200">
          <CardHeader>
            <CardTitle className="font-display font-medium text-warm-900">Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-warm-500">Client</p>
              <p className="font-medium text-warm-900">{invoice.client.name}</p>
              {invoice.client.legalName && (
                <p className="text-sm text-warm-500">
                  {invoice.client.legalName}
                </p>
              )}
            </div>
            {invoice.client.billingEmail && (
              <div>
                <p className="text-sm text-warm-500">Billing Email</p>
                <p className="font-medium text-warm-900">{invoice.client.billingEmail}</p>
              </div>
            )}
            {invoice.client.phone && (
              <div>
                <p className="text-sm text-warm-500">Phone</p>
                <p className="font-medium text-warm-900">{invoice.client.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-sm border-warm-200">
          <CardHeader>
            <CardTitle className="font-display font-medium text-warm-900">Amounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-warm-500">Subtotal</p>
              <p className="font-medium text-warm-900">
                ${Number(invoice.subtotal).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            {Number(invoice.taxAmount) > 0 && (
              <div>
                <p className="text-sm text-warm-500">Tax</p>
                <p className="font-medium text-warm-900">
                  ${Number(invoice.taxAmount).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-warm-500">Total</p>
              <p className="text-2xl font-display font-medium text-warm-900">
                ${Number(invoice.totalAmount).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-warm-500">Amount Paid</p>
              <p className="font-medium text-lime-700">
                ${Number(invoice.amountPaid).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-warm-500">Balance Due</p>
              <p
                className={`text-xl font-display font-medium ${
                  Number(invoice.balanceDue) > 0 ? 'text-red-600' : 'text-warm-900'
                }`}
              >
                ${Number(invoice.balanceDue).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-sm border-warm-200">
        <CardHeader>
          <CardTitle className="font-display font-medium text-warm-900">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-warm-200 hover:bg-transparent">
                <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Description</TableHead>
                <TableHead className="text-right text-xs font-medium text-warm-500 uppercase tracking-wider">Quantity</TableHead>
                <TableHead className="text-right text-xs font-medium text-warm-500 uppercase tracking-wider">Unit Price</TableHead>
                <TableHead className="text-right text-xs font-medium text-warm-500 uppercase tracking-wider">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lineItems.map((item: any) => (
                <TableRow key={item.id} className="border-warm-200 hover:bg-warm-50">
                  <TableCell className="font-medium text-warm-900">
                    {item.description}
                    {item.serviceAgreement && (
                      <Badge className="ml-2 rounded-sm text-[10px] px-1.5 py-0 bg-ocean-100 text-ocean-700 border-ocean-200">
                        Agreement
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-warm-600">
                    {Number(item.quantity).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right text-warm-600">
                    ${Number(item.unitPrice).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right font-medium text-warm-900">
                    ${Number(item.amount).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invoice.notes && (
        <Card className="rounded-sm border-warm-200">
          <CardHeader>
            <CardTitle className="font-display font-medium text-warm-900">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-warm-700 whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {invoice.payments && invoice.payments.length > 0 && (
        <PaymentHistory payments={invoice.payments} />
      )}
    </div>
  )
}

function InvoiceDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((j) => (
                  <div key={j}>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={<InvoiceDetailSkeleton />}>
      <InvoiceDetail id={id} />
    </Suspense>
  )
}

