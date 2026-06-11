import { Suspense } from 'react'
import Link from 'next/link'
import { AlertTriangle, FileText, Mail, Plus, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { GenerateInvoicesDialog } from '@/components/invoices/generate-invoices-dialog'
import { SendInvoiceDialog } from '@/components/invoices/send-invoice-dialog'
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge'
import { formatMoneyExact } from '@/lib/format'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

async function InvoicesList() {
  const user = await getCurrentUser()
  if (!user) {
    return (
      <div className="text-destructive">
        Please log in to view invoices.
      </div>
    )
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      client: {
        companyId: user.companyId,
        ...(user.branchId && { branchId: user.branchId }),
      },
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          billingEmail: true,
        },
      },
    },
    orderBy: {
      issueDate: 'desc',
    },
  })

  // Calculate totals
  const totalOutstanding = invoices
    .filter((inv: any) => ['draft', 'sent', 'partial'].includes(inv.status))
    .reduce((sum: number, inv: any) => sum + Number(inv.balanceDue), 0)

  const totalOverdue = invoices
    .filter((inv: any) => {
      if (inv.status !== 'sent' && inv.status !== 'partial') return false
      const dueDate = new Date(inv.dueDate)
      return dueDate < new Date() && Number(inv.balanceDue) > 0
    })
    .reduce((sum: number, inv: any) => sum + Number(inv.balanceDue), 0)

  return (
    <div>
      <PageHeader
        kicker="MONEY · INVOICES"
        title="Invoices"
        subtitle="Manage invoices and track payments"
        actions={
          <GenerateInvoicesDialog>
            <Button variant="gold">
              <Plus className="size-4" />
              Generate Invoices
            </Button>
          </GenerateInvoicesDialog>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Total Invoices"
            icon={FileText}
            value={invoices.length}
            sub="All time"
          />
          <StatCard
            label="Outstanding"
            icon={Wallet}
            value={formatMoneyExact(totalOutstanding)}
            sub="Unpaid invoices"
          />
          <StatCard
            label="Overdue"
            icon={AlertTriangle}
            tone="coral"
            value={formatMoneyExact(totalOverdue)}
            sub="Past due"
          />
        </div>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
            <CardDescription className="text-xs">
              {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No invoices yet — your agreements are ready when you are"
                description="Generate this month's invoices from your active service agreements and they'll show up here, balances and all."
                action={
                  <GenerateInvoicesDialog>
                    <Button variant="outline">
                      <Plus className="size-4" />
                      Generate Invoices from Agreements
                    </Button>
                  </GenerateInvoicesDialog>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice: any) => {
                    const dueDate = new Date(invoice.dueDate)
                    const isOverdue =
                      (invoice.status === 'sent' || invoice.status === 'partial') &&
                      dueDate < new Date() &&
                      Number(invoice.balanceDue) > 0

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
                        <TableCell className="text-muted-foreground">{invoice.client.name}</TableCell>
                        <TableCell className="font-mono tabular-nums text-muted-foreground">
                          {new Date(invoice.issueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          <span
                            className={
                              isOverdue
                                ? 'text-coral-600 dark:text-coral-300'
                                : 'text-muted-foreground'
                            }
                          >
                            {new Date(invoice.dueDate).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-foreground">
                          {formatMoneyExact(Number(invoice.totalAmount))}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums font-medium text-foreground">
                          {formatMoneyExact(Number(invoice.balanceDue))}
                        </TableCell>
                        <TableCell>
                          <InvoiceStatusBadge status={invoice.status} isOverdue={isOverdue} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <SendInvoiceDialog
                              invoiceId={invoice.id}
                              invoiceNumber={invoice.invoiceNumber}
                              defaultEmail={invoice.client.billingEmail || ''}
                            >
                              <Button variant="ghost" size="sm">
                                <Mail className="size-4" />
                                Send
                              </Button>
                            </SendInvoiceDialog>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/invoices/${invoice.id}`}>View</Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InvoicesListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-24" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={<InvoicesListSkeleton />}>
      <InvoicesList />
    </Suspense>
  )
}
