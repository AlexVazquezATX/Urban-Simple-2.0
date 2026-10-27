import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendSms, toE164 } from '@/lib/notify/sms'
import { SMS_OPT_IN_CONFIRMATION } from '@/lib/notify/sms-consent'

/**
 * GET /api/users/me
 * Get current user's information
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Alert preferences aren't part of the cached auth lookup.
    const prefs = await prisma.user.findUnique({
      where: { id: user.id },
      select: { smsAlerts: true, preferredLanguage: true },
    })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role, // effective role (after any impersonation override)
      realRole: user.realRole, // actual DB role — used to gate the role-switcher UI
      impersonating: user.impersonating,
      impersonatedClientId: user.impersonatedClientId,
      companyId: user.companyId,
      branchId: user.branchId,
      emailSignature: user.emailSignature,
      signatureLogoUrl: user.signatureLogoUrl,
      smsAlerts: prefs?.smsAlerts ?? false,
      preferredLanguage: prefs?.preferredLanguage ?? 'en',
    })
  } catch (error: any) {
    console.error('Get current user error:', error)
    return NextResponse.json(
      { error: 'Failed to get user', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/users/me
 * Update the current user's own settings: email signature, phone, text
 * alerts, field language. Nothing privileged (role, branch, active) here.
 * Only the fields present in the body are changed.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const data: Record<string, unknown> = {}

    if ('emailSignature' in body) data.emailSignature = body.emailSignature ?? null
    if ('signatureLogoUrl' in body) data.signatureLogoUrl = body.signatureLogoUrl ?? null

    if ('phone' in body) {
      if (body.phone !== null && typeof body.phone !== 'string') {
        return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
      }
      data.phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null
    }
    if ('smsAlerts' in body) {
      if (typeof body.smsAlerts !== 'boolean') {
        return NextResponse.json({ error: 'smsAlerts must be true or false' }, { status: 400 })
      }
      data.smsAlerts = body.smsAlerts
    }
    if ('preferredLanguage' in body) {
      if (body.preferredLanguage !== 'en' && body.preferredLanguage !== 'es') {
        return NextResponse.json({ error: 'preferredLanguage must be en or es' }, { status: 400 })
      }
      data.preferredLanguage = body.preferredLanguage
    }

    let confirmSmsTo: string | null = null
    if ('smsAlerts' in body || 'phone' in body) {
      const current = await prisma.user.findUnique({
        where: { id: user.id },
        select: { smsAlerts: true, phone: true },
      })
      const nextSms = (data.smsAlerts as boolean | undefined) ?? current?.smsAlerts ?? false
      const nextPhone = 'phone' in data ? (data.phone as string | null) : current?.phone ?? null
      if (nextSms && !toE164(nextPhone)) {
        return NextResponse.json({ error: 'Text alerts need a valid mobile number' }, { status: 400 })
      }
      // Newly on, or on with a new number: confirm the opt-in by text.
      if (nextSms && (!current?.smsAlerts || toE164(nextPhone) !== toE164(current?.phone))) {
        confirmSmsTo = nextPhone
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        companyId: true,
        branchId: true,
        emailSignature: true,
        signatureLogoUrl: true,
        smsAlerts: true,
        preferredLanguage: true,
      },
    })

    if (confirmSmsTo) {
      await sendSms({ companyId: updatedUser.companyId, to: confirmSmsTo, body: SMS_OPT_IN_CONFIRMATION, userId: user.id })
    }

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Failed to update user', details: error.message },
      { status: 500 }
    )
  }
}
