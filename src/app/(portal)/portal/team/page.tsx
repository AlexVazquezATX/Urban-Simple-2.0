import { format } from 'date-fns'
import { Mail, Phone, Users, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import { InviteTeammateButton } from '@/components/portal/invite-teammate-button'

export default async function PortalTeamPage() {
  const ctx = await requirePortalContext()

  // List all portal-enabled contacts for this client.
  const contacts = await prisma.clientContact.findMany({
    where: { clientId: ctx.client.id, isPortalUser: true },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      portalAccessGranted: true,
      userId: true,
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-medium text-warm-900">Team</h1>
          <p className="mt-1 text-sm text-warm-500">
            People at {ctx.client.name} who can access this portal. Invite anyone you want included.
          </p>
        </div>
        <InviteTeammateButton />
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-sm border border-dashed border-warm-300 bg-white p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-warm-300" />
          <p className="mt-2 text-sm text-warm-700">No teammates yet.</p>
          <p className="text-xs text-warm-500">Invite a GM, kitchen manager, or anyone else who needs access.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c) => {
            const isYou = c.userId === ctx.userId
            return (
              <li
                key={c.id}
                className="flex items-start gap-3 rounded-sm border border-warm-200 bg-white p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-warm-100 text-warm-700 text-sm font-medium">
                  {c.firstName.charAt(0)}
                  {c.lastName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-warm-900">
                      {c.firstName} {c.lastName}
                    </p>
                    {isYou && (
                      <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-ocean-100 text-ocean-700 border-ocean-200">
                        You
                      </Badge>
                    )}
                    <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 capitalize border-warm-300 text-warm-600">
                      {c.role}
                    </Badge>
                    <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-lime-100 text-lime-700 border-lime-200">
                      <ShieldCheck className="mr-0.5 h-2.5 w-2.5" />
                      Active
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-warm-500">
                    {c.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {c.email}
                      </span>
                    )}
                    {c.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {c.phone}
                      </span>
                    )}
                    {c.portalAccessGranted && (
                      <span>Joined {format(c.portalAccessGranted, 'MMM yyyy')}</span>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="text-[11px] text-warm-500 text-center">
        Removing access? Contact your Urban Simple account manager. We&apos;ll add self-service removal soon.
      </p>
    </div>
  )
}
