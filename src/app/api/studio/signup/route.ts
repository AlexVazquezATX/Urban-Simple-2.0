/**
 * Studio Signup API
 *
 * POST - Create a new studio customer account
 * Creates: Supabase auth user + Company + User (CLIENT_USER) + auto TRIAL subscription
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prisma } from '@/lib/db'
import { getOrCreateSubscription } from '@/lib/services/studio-admin-service'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sendWelcomeEmail } from '@/lib/studio-email'

interface SignupInput {
  email: string
  password: string
  restaurantName: string
  firstName: string
  lastName: string
}

export async function POST(request: Request) {
  try {
    // Rate limit: 5 signup attempts per IP per 15 minutes
    const ip = getClientIp(request)
    const rl = checkRateLimit(`signup:${ip}`, { limit: 5, windowSeconds: 900 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again in a few minutes.' },
        { status: 429 }
      )
    }

    const body = (await request.json()) as SignupInput

    // Validate required fields
    if (!body.email || !body.password || !body.restaurantName || !body.firstName || !body.lastName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (body.password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if email already exists in our DB
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Create Supabase auth user
    const supabaseAdmin = createAdminClient()
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email.toLowerCase(),
      password: body.password,
      email_confirm: true, // Auto-confirm for now
    })

    if (authError) {
      console.error('[Studio Signup] Auth error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    // Create Company + User in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: body.restaurantName.trim(),
          email: body.email.toLowerCase(),
        },
      })

      const user = await tx.user.create({
        data: {
          authId: authData.user.id,
          companyId: company.id,
          email: body.email.toLowerCase(),
          firstName: body.firstName.trim(),
          lastName: body.lastName.trim(),
          role: 'CLIENT_USER',
        },
      })

      return { company, user }
    })

    // Auto-create TRIAL subscription
    await getOrCreateSubscription(result.company.id)

    // Send welcome email (non-blocking — don't fail signup if email fails)
    sendWelcomeEmail({
      to: body.email.toLowerCase(),
      firstName: body.firstName.trim(),
      restaurantName: body.restaurantName.trim(),
    }).catch((err) => console.error('[Studio Signup] Welcome email failed:', err))

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
    })
  } catch (error) {
    console.error('[Studio Signup] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    )
  }
}
