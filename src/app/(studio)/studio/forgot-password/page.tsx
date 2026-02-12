'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/studio/reset-password`,
      })

      if (resetError) {
        setError(resetError.message)
        setLoading(false)
        return
      }

      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-1.5 justify-center">
            <Image
              src="/images/backhaus-logos/backhaus-logo-compact.png"
              alt="BackHaus"
              width={200}
              height={40}
              className="h-8 w-auto opacity-70"
              priority
            />
            <span className="w-2 h-2 rounded-full bg-amber-500 mb-0.5" />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-sm border border-warm-200 p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-lime-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-lime-600" />
              </div>
              <h1 className="text-lg font-display font-medium text-charcoal-900 mb-2">
                Check your email
              </h1>
              <p className="text-sm text-warm-500 mb-6">
                We sent a password reset link to <strong className="text-warm-700">{email}</strong>.
                Click the link in the email to set a new password.
              </p>
              <p className="text-xs text-warm-400">
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button
                  onClick={() => setSent(false)}
                  className="text-ocean-600 hover:text-ocean-700 font-medium"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-display font-medium text-charcoal-900 mb-1">
                Reset your password
              </h1>
              <p className="text-sm text-warm-500 mb-6">
                Enter the email you used to sign up and we&apos;ll send you a reset link.
              </p>

              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@restaurant.com"
                    required
                    autoComplete="email"
                    className="border-warm-200 focus:border-ocean-400 focus:ring-ocean-400"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-br from-ocean-500 to-ocean-600 hover:from-ocean-600 hover:to-ocean-700 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Back to login */}
        <div className="text-center mt-4">
          <Link
            href="/studio/login"
            className="inline-flex items-center gap-1 text-sm text-warm-500 hover:text-warm-700"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
