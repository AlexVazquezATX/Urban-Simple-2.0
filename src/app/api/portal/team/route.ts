import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getPortalContext } from '@/lib/portal-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/portal/team — list all portal users for the authenticated client.
export async function GET() {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contacts = await prisma.clientContact.findMany({
    where: {
      clientId: ctx.client.id,
      isPortalUser: true,
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      isPortalUser: true,
      portalAccessGranted: true,
      userId: true,
    },
  })

  return NextResponse.json(contacts)
}

// POST /api/portal/team — invite a new teammate to the portal. Any active
// portal user can invite a teammate to their own client. Mirrors the admin
// portal-invite flow but scoped to the inviter's own client.
//
// Body: { firstName, lastName, email, phone?, role? }
export async function POST(request: NextRequest) {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const firstName = (body.firstName as string | undefined)?.trim() || ''
  const lastName = (body.lastName as string | undefined)?.trim() || ''
  const email = (body.email as string | undefined)?.trim().toLowerCase() || ''
  const phone = (body.phone as string | undefined)?.trim() || null
  const role = (body.role as string | undefined)?.trim() || 'operations'

  if (!firstName) return NextResponse.json({ error: 'First name required' }, { status: 400 })
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  // Check for an existing contact under this client with the same email.
  const existingContact = await prisma.clientContact.findFirst({
    where: { clientId: ctx.client.id, email },
    select: { id: true, isPortalUser: true, userId: true },
  })

  // Look up branchId for the new User row (we need it to satisfy the schema).
  const client = await prisma.client.findUnique({
    where: { id: ctx.client.id },
    select: { branchId: true, companyId: true },
  })
  if (!client) return NextResponse.json({ error: 'Client missing' }, { status: 500 })

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const redirectTo = `${baseUrl}/portal/login?invited=true`

  const admin = createAdminClient()

  // If an existing User exists for this email, reuse them. Otherwise create
  // via Supabase invite + Prisma create.
  const existingUser = await prisma.user.findFirst({
    where: { email },
    select: { id: true, authId: true, role: true, isActive: true },
  })

  let userRecordId: string

  if (existingUser) {
    userRecordId = existingUser.id
    if (existingUser.authId) {
      const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo })
      if (error) console.warn('[portal/team invite] re-invite warn:', error.message)
    }
  } else {
    const { data: invited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, { redirectTo })
    if (inviteError || !invited?.user) {
      return NextResponse.json(
        { error: inviteError?.message || 'Failed to send invite' },
        { status: 500 }
      )
    }
    const created = await prisma.user.create({
      data: {
        authId: invited.user.id,
        companyId: client.companyId,
        branchId: client.branchId,
        email,
        firstName,
        lastName,
        role: 'CLIENT_USER',
        isActive: true,
      },
      select: { id: true },
    })
    userRecordId = created.id
  }

  // Create or update the ClientContact link.
  let contactId: string
  if (existingContact) {
    contactId = existingContact.id
    await prisma.clientContact.update({
      where: { id: existingContact.id },
      data: {
        firstName: firstName,
        lastName: lastName,
        phone,
        role,
        userId: userRecordId,
        isPortalUser: true,
        portalAccessGranted: existingContact.userId ? undefined : new Date(),
      },
    })
  } else {
    const newContact = await prisma.clientContact.create({
      data: {
        clientId: ctx.client.id,
        firstName,
        lastName,
        email,
        phone,
        role,
        userId: userRecordId,
        isPortalUser: true,
        portalAccessGranted: new Date(),
      },
    })
    contactId = newContact.id
  }

  return NextResponse.json({ success: true, contactId })
}
