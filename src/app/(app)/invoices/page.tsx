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
          <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900">Invoices</h1>
          <p className="text-sm text-warm-500">
            Manage invoices and track payments
          </p>
        </div>
        <GenerateInvoicesDialog>
          <Button variant="lime" className="rounded-sm">
            <Plus className="mr-2 h-4 w-4" />
            Generate Invoices
          </Button>
        </GenerateInvoicesDialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-sm border-warm-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-warm-700">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-warm-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-medium text-warm-900">{invoices.length}</div>
            <p className="text-xs text-warm-500">All time</p>
          </CardContent>
        </Card>
        <Card className="rounded-sm border-warm-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-warm-700">Outstanding</CardTitle>
            <FileText className="h-4 w-4 text-warm-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-medium text-yellow-600">
              ${totalOutstanding.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-warm-500">Unpaid invoices</p>
          </CardContent>
        </Card>
        <Card className="rounded-sm border-warm-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-warm-700">Overdue</CardTitle>
            <FileText className="h-4 w-4 text-warm-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-medium text-red-600">
              ${totalOverdue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-warm-500">Past due</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-sm border-warm-200">
        <CardHeader>
          <CardTitle className="font-display font-medium text-warm-900">All Invoices</CardTitle>
          <CardDescription className="text-warm-500">
            {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12 text-warm-500">
              <FileText className="mx-auto h-12 w-12 mb-4 text-warm-400" />
              <p>No invoices yet</p>
              <GenerateInvoicesDialog>
                <Button variant="outline" className="mt-4 rounded-sm border-warm-200 text-warm-700 hover:border-ocean-400">
                  Generate Invoices from Agreements
                </Button>
              </GenerateInvoicesDialog>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-warm-200 hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Invoice #</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Client</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Issue Date</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Due Date</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Amount</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Balance</TableHead>
                  <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-right text-xs font-medium text-warm-500 uppercase tracking-wider">Actions</TableHead>
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
                        {new Date(invoice.issueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className={isOverdue ? 'text-red-600' : 'text-warm-600'}>
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-warm-900 font-medium">
                        ${Number(invoice.totalAmount).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
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
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <SendInvoiceDialog
                            invoiceId={invoice.id}
                            invoiceNumber={invoice.invoiceNumber}
                            defaultEmail={invoice.client.billingEmail || ''}
                          />
                          <Link href={`/invoices/${invoice.id}`}>
                            <Button variant="ghost" size="sm" className="rounded-sm text-warm-600 hover:text-ocean-600 hover:bg-warm-50">
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




