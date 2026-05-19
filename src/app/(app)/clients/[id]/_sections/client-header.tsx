import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { ClientForm } from '@/components/forms/client-form'
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Lightweight header section. Fetches only the client's own fields + counts,
// so it streams in well before the heavier detail content below it.
export async function ClientHeader({ id }: { id: string }) {
  const user = await getCurrentUser()
  if (!user) return null

  const client = await prisma.client.findFirst({
    where: { id, companyId: user.companyId, deletedAt: null },
    include: {
      branch: { select: { name: true, code: true } },
      parentClient: { select: { id: true, name: true } },
      _count: {
        select: {
          locations: { where: { isActive: true, deletedAt: null } },
          childClients: { where: { deletedAt: null } },
        },
      },
    },
  })
  if (!client) return null

  // ClientForm edits the full client — convert the Decimal taxRate first.
  const serializedClient = {
    ...client,
    taxRate: client.taxRate ? Number(client.taxRate) : null,
  }

  const breadcrumbItems = client.parentClient
    ? [
        { label: 'Clients', href: '/clients' },
        { label: client.parentClient.name, href: `/clients/${client.parentClient.id}` },
        { label: client.name },
      ]
    : [{ label: 'Clients', href: '/clients' }, { label: client.name }]

  return (
    <div className="space-y-3">
      <Breadcrumb items={breadcrumbItems} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900 dark:text-cream-100">
            {client.name}
          </h1>
          <p className="text-sm text-warm-500 dark:text-cream-400">
            {client.legalName && `${client.legalName} • `}
            {client.branch.name}
            {client._count.locations > 0 && (
              <span className="ml-1">
                • {client._count.locations}{' '}
                {client._count.locations === 1 ? 'location' : 'locations'}
              </span>
            )}
            {client._count.childClients > 0 && (
              <span className="ml-1">
                • {client._count.childClients} child
                {client._count.childClients === 1 ? '' : 'ren'}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ClientForm client={serializedClient}>
            <Button
              variant="outline"
              className="rounded-sm border-warm-200 text-warm-700 hover:border-ocean-400 hover:bg-warm-50 dark:border-charcoal-700 dark:text-cream-300 dark:hover:bg-charcoal-800"
            >
              Edit Client
            </Button>
          </ClientForm>
          <ConfirmDeleteButton
            endpoint={`/api/clients/${id}`}
            entityLabel={client.name}
            entityKind="client"
            redirectTo="/clients"
            buttonLabel="Delete"
            variant="outline"
            size="default"
            className="rounded-sm border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
          />
        </div>
      </div>
    </div>
  )
}
