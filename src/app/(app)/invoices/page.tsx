import { Suspense } from 'react'
import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { GenerateInvoicesDialog } from '@/components/forms/generate-invoices-dialog'
import { SendInvoiceDialog } from '@/components/invoices/send-invoice-dialog'
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">
            Manage invoices and track payments
          </p>
        </div>
        <GenerateInvoicesDialog>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Generate Invoices
          </Button>
        </GenerateInvoicesDialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalOutstanding.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">Unpaid invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              ${totalOverdue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">Past due</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>
            {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No invoices yet</p>
              <GenerateInvoicesDialog>
                <Button variant="outline" className="mt-4">
                  Generate Invoices from Agreements
                </Button>
              </GenerateInvoicesDialog>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                        {new Date(invoice.issueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className={isOverdue ? 'text-destructive' : ''}>
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        ${Number(invoice.totalAmount).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
                        ${Number(invoice.balanceDue).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>
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
                        >
                          {invoice.status === 'sent' && isOverdue
                            ? 'Overdue'
                            : invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <SendInvoiceDialog
                            invoiceId={invoice.id}
                            invoiceNumber={invoice.invoiceNumber}
                            defaultEmail={invoice.client.billingEmail || ''}
                          />
                          <Link href={`/invoices/${invoice.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
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




