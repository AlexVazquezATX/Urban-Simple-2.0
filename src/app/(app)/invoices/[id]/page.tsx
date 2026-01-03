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
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{invoice.invoiceNumber}</h1>
            <p className="text-muted-foreground">
              {invoice.client.name} •{' '}
              {new Date(invoice.issueDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              invoice.status === 'paid'
                ? 'default'
                : invoice.status === 'draft'
                  ? 'secondary'
                  : isOverdue
                    ? 'destructive'
                    : 'outline'
            }
            className="text-lg px-3 py-1"
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
              <Button size="sm">
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
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Issue Date</p>
              <p className="font-medium">
                {new Date(invoice.issueDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due Date</p>
              <p
                className={`font-medium ${isOverdue ? 'text-destructive' : ''}`}
              >
                {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
            </div>
            {invoice.sentAt && (
              <div>
                <p className="text-sm text-muted-foreground">Sent At</p>
                <p className="font-medium">
                  {new Date(invoice.sentAt).toLocaleDateString()}
                </p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-sm text-muted-foreground">Payment Terms</p>
                <p className="font-medium">{invoice.terms}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Client</p>
              <p className="font-medium">{invoice.client.name}</p>
              {invoice.client.legalName && (
                <p className="text-sm text-muted-foreground">
                  {invoice.client.legalName}
                </p>
              )}
            </div>
            {invoice.client.billingEmail && (
              <div>
                <p className="text-sm text-muted-foreground">Billing Email</p>
                <p className="font-medium">{invoice.client.billingEmail}</p>
              </div>
            )}
            {invoice.client.phone && (
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{invoice.client.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Amounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Subtotal</p>
              <p className="font-medium">
                ${Number(invoice.subtotal).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            {Number(invoice.taxAmount) > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Tax</p>
                <p className="font-medium">
                  ${Number(invoice.taxAmount).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">
                ${Number(invoice.totalAmount).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount Paid</p>
              <p className="font-medium">
                ${Number(invoice.amountPaid).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Balance Due</p>
              <p
                className={`text-xl font-bold ${
                  Number(invoice.balanceDue) > 0 ? 'text-destructive' : ''
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

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lineItems.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.description}
                    {item.serviceAgreement && (
                      <Badge variant="outline" className="ml-2">
                        Agreement
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(item.quantity).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    ${Number(item.unitPrice).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right font-medium">
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
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
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

