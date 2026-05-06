import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/clients/[id]/portal-invite — admin-only. Invites a ClientContact
// to the Urban Simple Portal. Creates a Supabase auth user (with a magic-link
// invite email), creates a User row with role CLIENT_USER, and links the
// ClientContact to that User. Idempotent on re-invite (re-sends the email).
//
// Body: { contactId: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { id: clientId } = await params
  const body = await request.json().catch(() => ({}))
  const contactId: string | undefined = body.contactId

  if (!contactId) {
    return NextResponse.json({ error: 'contactId is required' }, { status: 400 })
  }

  // Verify the contact belongs to a client in this user's company.
  const contact = await prisma.clientContact.findFirst({
    where: {
      id: contactId,
      clientId,
      client: { companyId: user.companyId, deletedAt: null },
    },
    include: { client: { select: { id: true, name: true, branchId: true } } },
  })
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }
  if (!contact.email) {
    return NextResponse.json({ error: 'Contact has no email on file' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Determine the redirect-after-set-password destination. Vercel preview
  // and prod use NEXT_PUBLIC_SITE_URL; local dev falls back to localhost.
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const redirectTo = `${baseUrl}/portal/login?invited=true`

  // If they already have a User record, re-send invite email and skip the
  // role / contact-link work.
  const existing = await prisma.user.findFirst({
    where: { email: contact.email },
    select: { id: true, authId: true, role: true },
  })

  let userRecordId: string

  if (existing) {
    userRecordId = existing.id

    // If their existing role is something else (e.g., MANAGER), don't downgrade.
    // Just make sure the contact links to them and they have portal access.
    if (existing.role !== 'CLIENT_USER') {
      // No-op — they may already be an internal user. Still link the contact.
    }

    // Re-send invite (Supabase generates a new magic link).
    if (existing.authId) {
      const { error } = await admin.auth.admin.inviteUserByEmail(contact.email, {
        redirectTo,
      })
      if (error) {
        console.warn('[portal-invite] re-invite warning:', error.message)
      }
    }
  } else {
    // Create the auth user (sends invite email automatically).
    const { data: invited, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(contact.email, { redirectTo })
    if (inviteError || !invited?.user) {
      return NextResponse.json(
        { error: inviteError?.message || 'Failed to send invite' },
        { status: 500 }
      )
    }

    const newUser = await prisma.user.create({
      data: {
        authId: invited.user.id,
        companyId: user.companyId,
        branchId: contact.client.branchId,
        email: contact.email,
        firstName: contact.firstName || contact.client.name,
        lastName: contact.lastName || '',
        role: 'CLIENT_USER',
        isActive: true,
      },
      select: { id: true },
    })

    userRecordId = newUser.id
  }

  await prisma.clientContact.update({
    where: { id: contactId },
    data: {
      userId: userRecordId,
      isPortalUser: true,
      portalAccessGranted: contact.portalAccessGranted ?? new Date(),
    },
  })

  return NextResponse.json({ success: true, userId: userRecordId })
}
