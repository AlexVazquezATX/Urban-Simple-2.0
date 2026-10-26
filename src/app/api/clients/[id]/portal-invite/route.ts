import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { invitePortalUser, sendPortalAccessLink, type PortalAccessResult } from '@/lib/portal-access'

// POST /api/clients/[id]/portal-invite — admin-only. Invites a ClientContact
// to the Urban Simple Portal. Creates a Supabase auth user (with an invite
// email), creates a User row with role CLIENT_USER, and links the
// ClientContact to that User. On re-invite it emails a fresh sign-in link and
// reports honestly whether the email went out.
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

  const email = contact.email.trim()
  const accessParams = {
    email,
    firstName: contact.firstName,
    clientName: contact.client.name,
    companyId: user.companyId,
    clientId,
  }

  // If they already have a User record, re-send access and skip the role work.
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, authId: true, role: true, isActive: true },
  })

  let userRecordId: string
  let access: PortalAccessResult

  if (existing) {
    // Never pull a staff account into a client portal, and never share one
    // portal login across two clients (getPortalContext would pick one at random).
    if (existing.role !== 'CLIENT_USER') {
      return NextResponse.json(
        { error: 'That email belongs to an Urban Simple staff account and cannot be given portal access.' },
        { status: 409 }
      )
    }
    const otherClient = await prisma.clientContact.findFirst({
      where: { userId: existing.id, isPortalUser: true, clientId: { not: clientId } },
      select: { client: { select: { name: true } } },
    })
    if (otherClient) {
      return NextResponse.json(
        { error: `That email already has portal access for ${otherClient.client.name}. Use a different email for this client.` },
        { status: 409 }
      )
    }

    userRecordId = existing.id
    if (!existing.isActive) {
      // An admin explicitly re-inviting a deactivated portal user restores them.
      await prisma.user.update({ where: { id: existing.id }, data: { isActive: true } })
    }

    if (existing.authId) {
      access = await sendPortalAccessLink({ ...accessParams, userId: existing.id })
    } else {
      // Existing User row with no login yet: invite (or link, if Supabase
      // already knows the address) and record the auth id.
      access = await invitePortalUser({ ...accessParams, userId: existing.id })
      if (!access.authUserId) {
        return NextResponse.json({ error: access.error || 'Failed to send invite' }, { status: 500 })
      }
      await prisma.user.update({
        where: { id: existing.id },
        data: { authId: access.authUserId },
      })
    }
  } else {
    access = await invitePortalUser(accessParams)
    if (!access.authUserId) {
      return NextResponse.json({ error: access.error || 'Failed to send invite' }, { status: 500 })
    }
    const authUserId = access.authUserId

    // The auth user may already be linked to a User row under another email.
    const byAuth = await prisma.user.findUnique({ where: { authId: authUserId }, select: { id: true } })
    if (byAuth) {
      return NextResponse.json(
        { error: 'That login is already linked to another account. Contact support to sort it out.' },
        { status: 409 }
      )
    }

    const newUser = await prisma.user.create({
      data: {
        authId: authUserId,
        companyId: user.companyId,
        branchId: contact.client.branchId,
        email,
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

  return NextResponse.json({
    success: true,
    userId: userRecordId,
    emailSent: access.emailSent,
    method: access.method,
    message: access.emailSent
      ? `Portal access email sent to ${email}.`
      : `Portal access is set up, but the email to ${email} could not be sent${access.error ? ` (${access.error})` : ''}.`,
  })
}
