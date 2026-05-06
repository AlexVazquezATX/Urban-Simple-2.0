import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/portal/signup — public, no auth required. Creates a self-serve
// portal account with a 14-day trial. Used by the public marketing page
// at /for-hospitality and the dedicated /portal/signup page.
//
// Body: {
//   businessName, businessType?, ownerFirstName, ownerLastName,
//   email, password, locationName?, locationAddress?, plan?
// }
//
// Side effects:
//   1. Create Supabase auth user (email + password)
//   2. Create Client (status active, isSelfServe true, 14-day trial)
//   3. Create one Location (uses provided name/address or defaults)
//   4. Create User row (CLIENT_USER role) linked to the auth user
//   5. Create ClientContact row linked to that User (isPortalUser true)
//
// Returns: { ok, clientId, userId } so the front-end can redirect to
// /portal/login or auto-sign-in via Supabase.

const TRIAL_DAYS = 14
const SELF_SERVE_COMPANY_NAME = 'Urban Simple LLC'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const businessName = (body.businessName as string | undefined)?.trim() || ''
  const businessType = (body.businessType as string | undefined)?.trim() || null
  const ownerFirstName = (body.ownerFirstName as string | undefined)?.trim() || ''
  const ownerLastName = (body.ownerLastName as string | undefined)?.trim() || ''
  const email = (body.email as string | undefined)?.trim().toLowerCase() || ''
  const password = (body.password as string | undefined) || ''
  const locationName = (body.locationName as string | undefined)?.trim() || businessName
  const locationAddress = (body.locationAddress as string | undefined)?.trim() || ''
  const plan = ((body.plan as string | undefined) || 'starter').toLowerCase()

  if (!businessName) return NextResponse.json({ error: 'Business name required' }, { status: 400 })
  if (!ownerFirstName) return NextResponse.json({ error: 'Owner first name required' }, { status: 400 })
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }
  if (!['starter', 'pro'].includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  // The self-serve clients live under our company + Austin branch (we own the
  // SaaS). They're flagged isSelfServe=true so they show up differently in
  // admin views and don't pollute Urban Simple's cleaning-client metrics.
  const company = await prisma.company.findFirst({ where: { name: SELF_SERVE_COMPANY_NAME } })
  if (!company) return NextResponse.json({ error: 'Company misconfigured' }, { status: 500 })
  const branch = await prisma.branch.findFirst({
    where: { companyId: company.id, code: 'AUS', isActive: true },
  })
  if (!branch) return NextResponse.json({ error: 'Branch misconfigured' }, { status: 500 })

  // Reject if email already has a User attached (avoids double-account confusion).
  const existingUser = await prisma.user.findFirst({ where: { email }, select: { id: true } })
  if (existingUser) {
    return NextResponse.json(
      { error: 'An account with this email already exists. Sign in instead.' },
      { status: 409 }
    )
  }

  const admin = createAdminClient()

  // 1. Create the Supabase auth user with their chosen password (no magic link).
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip the confirmation email — they typed the password themselves
  })
  if (authError || !authData?.user) {
    return NextResponse.json(
      { error: authError?.message || 'Failed to create account' },
      { status: 500 }
    )
  }

  const authId = authData.user.id
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

  try {
    // 2. Client + 3. Location + 4. User + 5. ClientContact in a transaction.
    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          companyId: company.id,
          branchId: branch.id,
          name: businessName,
          billingEmail: email,
          status: 'active',
          isSelfServe: true,
          portalPlan: 'trial',
          portalStatus: 'trial',
          portalTrialEndsAt: trialEndsAt,
          portalSignupOrigin: 'self_serve',
          notes: businessType ? `Business type: ${businessType}` : null,
        },
      })

      const location = await tx.location.create({
        data: {
          clientId: client.id,
          branchId: branch.id,
          name: locationName,
          address: { street: locationAddress, city: '', state: '', zip: '' },
          isActive: true,
        },
      })

      const userRow = await tx.user.create({
        data: {
          authId,
          companyId: company.id,
          branchId: branch.id,
          email,
          firstName: ownerFirstName,
          lastName: ownerLastName,
          role: 'CLIENT_USER',
          isActive: true,
        },
      })

      await tx.clientContact.create({
        data: {
          clientId: client.id,
          firstName: ownerFirstName,
          lastName: ownerLastName,
          email,
          role: 'primary',
          userId: userRow.id,
          isPortalUser: true,
          portalAccessGranted: new Date(),
        },
      })

      return { clientId: client.id, userId: userRow.id, locationId: location.id }
    })

    return NextResponse.json({
      ok: true,
      ...result,
      trialEndsAt: trialEndsAt.toISOString(),
    })
  } catch (err: unknown) {
    // Roll back the auth user if the DB transaction failed; otherwise we leave
    // an orphan Supabase user that can never log in.
    try {
      await admin.auth.admin.deleteUser(authId)
    } catch (cleanupErr) {
      console.error('[signup] failed to roll back auth user:', cleanupErr)
    }
    const message = err instanceof Error ? err.message : 'Signup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
