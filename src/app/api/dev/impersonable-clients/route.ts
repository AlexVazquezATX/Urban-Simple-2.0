import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { IMPERSONATION_GATE_EMAIL } from '@/lib/impersonation'

// GET /api/dev/impersonable-clients
// Returns active clients the gated SUPER_ADMIN can impersonate as a portal
// user. Used by the role-switcher UI when CLIENT_USER is selected.
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.realRole !== 'SUPER_ADMIN' || user.email !== IMPERSONATION_GATE_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const clients = await prisma.client.findMany({
    where: { deletedAt: null, status: 'active' },
    select: { id: true, name: true, isSelfServe: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ clients })
}
