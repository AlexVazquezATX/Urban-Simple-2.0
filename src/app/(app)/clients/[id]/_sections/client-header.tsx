import { PageHeader } from '@/components/layout/page-header'
import { ClientActionsMenu } from '@/components/clients/client-actions-menu'
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

  // Children navigate back to their parent; everyone else back to the list.
  const backHref = client.parentClient ? `/clients/${client.parentClient.id}` : '/clients'

  return (
    <PageHeader
      className="mb-0"
      kicker={`CLIENTS · ${client.branch.code || client.branch.name}`}
      backHref={backHref}
      title={client.name}
      subtitle={
        <>
          {client.legalName && `${client.legalName} · `}
          {client.branch.name}
          {client._count.locations > 0 && (
            <>
              {' '}
              · {client._count.locations}{' '}
              {client._count.locations === 1 ? 'location' : 'locations'}
            </>
          )}
          {client._count.childClients > 0 && (
            <>
              {' '}
              · {client._count.childClients} child
              {client._count.childClients === 1 ? '' : 'ren'}
            </>
          )}
          {client.parentClient && <> · part of {client.parentClient.name}</>}
        </>
      }
      actions={
        <ClientActionsMenu
          endpoint={`/api/clients/${id}`}
          entityLabel={client.name}
          entityKind="client"
          redirectTo="/clients"
        />
      }
    />
  )
}
