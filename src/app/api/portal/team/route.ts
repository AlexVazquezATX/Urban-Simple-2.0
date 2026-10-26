import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getPortalContext } from '@/lib/portal-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { invitePortalUser, sendPortalAccessLink, type PortalAccessResult } from '@/lib/portal-access'

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

const TEAM_ROLES = ['primary', 'operations', 'billing', 'other'] as const

// POST /api/portal/team — invite a new teammate to the portal. Any active
// portal user can invite a teammate to their own client. Mirrors the admin
// portal-invite flow but scoped to the inviter's own client.
//
// Body: { firstName, lastName, email, phone?, role? }
export async function POST(request: NextRequest) {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limit = checkRateLimit(`portal-team-invite:${ctx.userId}`, {
    limit: 10,
    windowSeconds: 60 * 60,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'That is a lot of invites in a short time. Please try again in a bit.' },
      { status: 429 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const firstName = str(body.firstName).slice(0, 80)
  const lastName = str(body.lastName).slice(0, 80)
  const email = str(body.email).toLowerCase()
  const phone = str(body.phone).slice(0, 40) || null
  const role = str(body.role) || 'operations'

  if (!firstName) return NextResponse.json({ error: 'First name required' }, { status: 400 })
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }
  if (!(TEAM_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Check for an existing contact under this client with the same email.
  const existingContact = await prisma.clientContact.findFirst({
    where: { clientId: ctx.client.id, email: { equals: email, mode: 'insensitive' } },
    select: { id: true, isPortalUser: true, userId: true },
  })

  // Look up branchId for the new User row (we need it to satisfy the schema).
  const client = await prisma.client.findUnique({
    where: { id: ctx.client.id },
    select: { branchId: true, companyId: true },
  })
  if (!client) return NextResponse.json({ error: 'Client missing' }, { status: 500 })

  const accessParams = {
    email,
    firstName,
    clientName: ctx.client.name,
    companyId: client.companyId,
    clientId: ctx.client.id,
    invitedByName: `${ctx.firstName} ${ctx.lastName}`.trim() || null,
  }

  // If an existing User exists for this email, reuse them. Otherwise create
  // via Supabase invite + Prisma create.
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, authId: true, role: true, isActive: true },
  })

  let userRecordId: string
  let access: PortalAccessResult

  if (existingUser) {
    // Don't silently pull an Urban Simple staff account into a client's portal.
    // Only CLIENT_USER rows are eligible to be linked as portal contacts.
    if (existingUser.role !== 'CLIENT_USER') {
      return NextResponse.json(
        {
          error:
            'That email belongs to an Urban Simple staff account and cannot be added as a portal teammate.',
        },
        { status: 409 }
      )
    }
    // One portal login belongs to one client. Never link another client's user.
    const linkedElsewhere = await prisma.clientContact.findFirst({
      where: { userId: existingUser.id, clientId: { not: ctx.client.id } },
      select: { id: true },
    })
    if (linkedElsewhere) {
      return NextResponse.json(
        {
          error:
            'That email is already used by another business on the Urban Simple portal. Please use a different email, or email hello@urbansimple.net for help.',
        },
        { status: 409 }
      )
    }
    if (!existingUser.isActive) {
      return NextResponse.json(
        {
          error:
            'Portal access for that email was turned off. Email hello@urbansimple.net and we will restore it.',
        },
        { status: 409 }
      )
    }

    userRecordId = existingUser.id
    if (existingUser.authId) {
      // They already have a login: email a fresh sign-in link.
      access = await sendPortalAccessLink({ ...accessParams, userId: existingUser.id })
    } else {
      // A User row exists but was never provisioned in Supabase auth. Actually
      // send the invite now and link the new auth id, instead of pretending an
      // email went out.
      access = await invitePortalUser({ ...accessParams, userId: existingUser.id })
      if (!access.authUserId) {
        return NextResponse.json({ error: access.error || 'Failed to send invite' }, { status: 500 })
      }
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { authId: access.authUserId },
      })
    }
  } else {
    access = await invitePortalUser(accessParams)
    if (!access.authUserId) {
      return NextResponse.json({ error: access.error || 'Failed to send invite' }, { status: 500 })
    }
    const authUserId = access.authUserId
    const byAuth = await prisma.user.findUnique({ where: { authId: authUserId }, select: { id: true } })
    if (byAuth) {
      return NextResponse.json(
        { error: 'That email is already in use. Email hello@urbansimple.net and we will sort it out.' },
        { status: 409 }
      )
    }
    const created = await prisma.user.create({
      data: {
        authId: authUserId,
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

  return NextResponse.json({
    success: true,
    contactId,
    emailSent: access.emailSent,
    message: access.emailSent
      ? `Invite sent to ${email}.`
      : `${firstName} was added, but we could not send the email. Please try again in a few minutes.`,
  })
}
