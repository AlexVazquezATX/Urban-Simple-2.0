// Email Verification Service
// Verifies emails via Abstract API

import { VerificationResult } from '@/lib/types/email-prospecting'

const ABSTRACT_API_KEY = process.env.ABSTRACT_API_KEY
const ABSTRACT_BASE_URL = 'https://emailvalidation.abstractapi.com/v1'

interface AbstractAPIResponse {
  email: string
  autocorrect: string
  deliverability: 'DELIVERABLE' | 'UNDELIVERABLE' | 'RISKY' | 'UNKNOWN'
  quality_score: string
  is_valid_format: { value: boolean; text: string }
  is_free_email: { value: boolean; text: string }
  is_disposable_email: { value: boolean; text: string }
  is_role_email: { value: boolean; text: string }
  is_catchall_email: { value: boolean; text: string }
  is_mx_found: { value: boolean; text: string }
  is_smtp_valid: { value: boolean; text: string }
}

/**
 * Verify a single email address using Abstract API
 * Cost: ~$0.0036 per verification on $9/mo plan
 */
export async function verifyEmail(email: string): Promise<VerificationResult> {
  if (!ABSTRACT_API_KEY) {
    throw new Error('ABSTRACT_API_KEY not configured')
  }

  const url = `${ABSTRACT_BASE_URL}/?api_key=${ABSTRACT_API_KEY}&email=${encodeURIComponent(email)}`

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Abstract API error: ${response.status}`)
  }

  const data: AbstractAPIResponse = await response.json()

  return {
    email: data.email,
    is_valid: data.deliverability === 'DELIVERABLE',
    is_format_valid: data.is_valid_format.value,
    is_mx_valid: data.is_mx_found.value,
    is_smtp_valid: data.is_smtp_valid.value,
    is_disposable: data.is_disposable_email.value,
    is_free_provider: data.is_free_email.value,
    is_role_email: data.is_role_email.value,
    is_catch_all: data.is_catchall_email.value,
    quality_score: parseFloat(data.quality_score) * 100,
    did_you_mean: data.autocorrect || undefined,
  }
}

/**
 * Verify multiple emails (with rate limiting)
 * Abstract allows ~10 requests/second
 */
export async function verifyEmailBatch(
  emails: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, VerificationResult>> {
  const results = new Map<string, VerificationResult>()
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  for (let i = 0; i < emails.length; i++) {
    try {
      const result = await verifyEmail(emails[i])
      results.set(emails[i], result)
    } catch (error) {
      // Log error but continue
      results.set(emails[i], {
        email: emails[i],
        is_valid: false,
        is_format_valid: false,
        is_mx_valid: false,
        is_smtp_valid: false,
        is_disposable: false,
        is_free_provider: false,
        is_role_email: false,
        is_catch_all: false,
        quality_score: 0,
      })
    }

    onProgress?.(i + 1, emails.length)

    // Rate limit: 100ms between requests
    if (i < emails.length - 1) {
      await delay(100)
    }
  }

  return results
}

/**
 * Find the best email from pattern guesses by verifying each
 */
export async function findBestEmail(
  guesses: Array<{ email: string; confidence: number }>
): Promise<{
  email: string
  confidence: number
  verification: VerificationResult
} | null> {
  // Sort by confidence (highest first)
  const sorted = [...guesses].sort((a, b) => b.confidence - a.confidence)

  for (const guess of sorted) {
    try {
      const verification = await verifyEmail(guess.email)

      if (verification.is_valid && verification.is_smtp_valid) {
        return {
          email: guess.email,
          confidence: Math.min(95, guess.confidence + verification.quality_score),
          verification,
        }
      }
    } catch {
      continue
    }
  }

  return null
}
