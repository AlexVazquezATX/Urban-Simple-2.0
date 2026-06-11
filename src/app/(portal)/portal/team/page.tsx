import { format } from 'date-fns'
import { Mail, Phone, ShieldCheck, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import { InviteTeammateButton } from '@/components/portal/invite-teammate-button'
import { LiveEmpty, LivePage, LivePageHead } from '@/components/portal/live-shell'

// Team — inner-page shell following the LiveLog card language.

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
    <LivePage>
      <LivePageHead
        kicker="Your people"
        title="Team"
        sub={`People at ${ctx.client.name} who can access this portal. Invite anyone you want included.`}
        right={<InviteTeammateButton />}
      />

      {contacts.length === 0 ? (
        <LiveEmpty
          icon={<Users className="h-4.5 w-4.5" />}
          title="No teammates yet — bring in your crew"
          sub="Invite a GM, kitchen manager, or anyone else who needs access."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {contacts.map((c) => {
            const isYou = c.userId === ctx.userId
            return (
              <li
                key={c.id}
                className="flex items-start gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-soft"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-600/10 font-display text-sm font-bold text-gold-600">
                  {c.firstName.charAt(0)}
                  {c.lastName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {c.firstName} {c.lastName}
                    </p>
                    {isYou && <Badge variant="gold">You</Badge>}
                    <Badge variant="neutral" className="capitalize">
                      {c.role}
                    </Badge>
                    <Badge variant="green">
                      <ShieldCheck className="h-2.5 w-2.5" />
                      Active
                    </Badge>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
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
                      <span className="font-mono tabular-nums">
                        Joined {format(c.portalAccessGranted, 'MMM yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Removing access? Contact your Urban Simple account manager. We&apos;ll add self-service
        removal soon.
      </p>
    </LivePage>
  )
}
