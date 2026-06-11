import { Suspense } from 'react'
import { DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { PageHeader } from '@/components/layout/page-header'
import { MarkAsSentButton } from '@/components/invoice-actions'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { PaymentForm } from '@/components/forms/payment-form'
import { PaymentHistory } from '@/components/billing/payment-history'
import { QBSyncButton } from '@/components/billing/qb-sync-button'
import { formatMoneyExact } from '@/lib/format'
import { getApiUrl } from '@/lib/api'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="kicker text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium text-foreground">{children}</div>
    </div>
  )
}

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
    <div>
      <PageHeader
        kicker="MONEY · INVOICE"
        title={invoice.invoiceNumber}
        subtitle={
          <>
            {invoice.client.name} ·{' '}
            <span className="font-mono tabular-nums">
              {new Date(invoice.issueDate).toLocaleDateString()}
            </span>
          </>
        }
        backHref="/invoices"
        actions={
          <>
            <InvoiceStatusBadge status={invoice.status} isOverdue={isOverdue} />
            {invoice.status === 'draft' && (
              <MarkAsSentButton invoiceId={invoice.id} />
            )}
            {Number(invoice.balanceDue) > 0 && (
              <PaymentForm
                clientId={invoice.clientId}
                invoiceId={invoice.id}
                invoiceBalance={Number(invoice.balanceDue)}
              >
                <Button variant="gold" size="sm">
                  <DollarSign className="size-4" />
                  Record Payment
                </Button>
              </PaymentForm>
            )}
            <QBSyncButton
              invoiceId={invoice.id}
              qbInvoiceId={invoice.qbInvoiceId}
            />
          </>
        }
      />

      <div className="flex flex-col gap-6">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Issue Date">
                <span className="font-mono tabular-nums">
                  {new Date(invoice.issueDate).toLocaleDateString()}
                </span>
              </Field>
              <Field label="Due Date">
                <span
                  className={`font-mono tabular-nums ${
                    isOverdue ? 'text-coral-600 dark:text-coral-300' : ''
                  }`}
                >
                  {new Date(invoice.dueDate).toLocaleDateString()}
                </span>
              </Field>
              {invoice.sentAt && (
                <Field label="Sent At">
                  <span className="font-mono tabular-nums">
                    {new Date(invoice.sentAt).toLocaleDateString()}
                  </span>
                </Field>
              )}
              {invoice.terms && <Field label="Payment Terms">{invoice.terms}</Field>}
            </CardContent>
          </Card>

          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Client">
                {invoice.client.name}
                {invoice.client.legalName && (
                  <p className="mt-0.5 text-sm font-normal text-muted-foreground">
                    {invoice.client.legalName}
                  </p>
                )}
              </Field>
              {invoice.client.billingEmail && (
                <Field label="Billing Email">{invoice.client.billingEmail}</Field>
              )}
              {invoice.client.phone && (
                <Field label="Phone">
                  <span className="font-mono tabular-nums">{invoice.client.phone}</span>
                </Field>
              )}
            </CardContent>
          </Card>

          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Amounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Subtotal">
                <span className="font-mono tabular-nums">
                  {formatMoneyExact(Number(invoice.subtotal))}
                </span>
              </Field>
              {Number(invoice.taxAmount) > 0 && (
                <Field label="Tax">
                  <span className="font-mono tabular-nums">
                    {formatMoneyExact(Number(invoice.taxAmount))}
                  </span>
                </Field>
              )}
              <div>
                <p className="kicker text-muted-foreground">Total</p>
                <p className="mt-1 font-display text-2xl font-bold tracking-[-0.5px] tabular-nums text-foreground">
                  {formatMoneyExact(Number(invoice.totalAmount))}
                </p>
              </div>
              <Field label="Amount Paid">
                <span className="font-mono tabular-nums text-green-600 dark:text-green-300">
                  {formatMoneyExact(Number(invoice.amountPaid))}
                </span>
              </Field>
              <div>
                <p className="kicker text-muted-foreground">Balance Due</p>
                <p
                  className={`mt-1 font-display text-xl font-bold tracking-[-0.5px] tabular-nums ${
                    Number(invoice.balanceDue) > 0
                      ? 'text-coral-600 dark:text-coral-300'
                      : 'text-foreground'
                  }`}
                >
                  {formatMoneyExact(Number(invoice.balanceDue))}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="gap-4">
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
                    <TableCell className="font-medium text-foreground">
                      {item.description}
                      {item.serviceAgreement && (
                        <Badge variant="teal" className="ml-2">
                          Agreement
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {Number(item.quantity).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {formatMoneyExact(Number(item.unitPrice))}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums font-medium text-foreground">
                      {formatMoneyExact(Number(item.amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {invoice.notes && (
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <PaymentHistory payments={invoice.payments} />
        )}
      </div>
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
