import Link from 'next/link'
import { Mail, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Recent correspondence for this client from the Comms Hub (invoices,
// reminders, replies). Server component; renders nothing until the
// comm_messages table exists / has rows for this client.
export async function ClientCommunicationsSection({ id }: { id: string }) {
  const user = await getCurrentUser()
  if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return null

  let rows: Array<{
    id: string; direction: string; subject: string | null; toEmail: string | null
    fromEmail: string | null; status: string; category: string
    sentAt: Date | null; receivedAt: Date | null; createdAt: Date
    openedAt: Date | null; deliveredAt: Date | null
  }> = []
  try {
    rows = await prisma.commMessage.findMany({
      where: { companyId: user.companyId, clientId: id },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true, direction: true, subject: true, toEmail: true, fromEmail: true,
        status: true, category: true, sentAt: true, receivedAt: true, createdAt: true,
        openedAt: true, deliveredAt: true,
      },
    })
  } catch {
    return null // table not applied yet
  }
  if (rows.length === 0) return null

  const fmt = (d: Date | null) =>
    d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''

  return (
    <div className="rounded-xl border border-charcoal-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-semibold text-charcoal-900 flex items-center gap-2">
          <Mail className="h-4 w-4 text-bronze-500" /> Communications
        </h2>
        <Link href="/communications" className="text-sm text-bronze-600 hover:underline">
          Open hub →
        </Link>
      </div>
      <div className="divide-y divide-charcoal-100">
        {rows.map((r) => (
          <div key={r.id} className="py-2 flex items-center gap-3 text-sm">
            {r.direction === 'inbound'
              ? <ArrowDownLeft className="h-3.5 w-3.5 text-bronze-500 shrink-0" />
              : <ArrowUpRight className="h-3.5 w-3.5 text-charcoal-400 shrink-0" />}
            <span className="truncate flex-1 text-charcoal-800">{r.subject || '(no subject)'}</span>
            <span className="text-xs text-charcoal-400 shrink-0 uppercase tracking-wide">{r.status}</span>
            <span className="text-xs text-charcoal-400 shrink-0 w-14 text-right">
              {fmt(r.receivedAt ?? r.sentAt ?? r.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
