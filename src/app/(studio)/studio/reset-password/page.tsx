'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase handles the token exchange automatically via the URL hash
  useEffect(() => {
    const supabase = createClient()

    // Listen for the PASSWORD_RECOVERY event from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // Also check if we already have a session (user clicked link, session was set)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      // Sign out so they can log in fresh with the new password
      await supabase.auth.signOut()
      setTimeout(() => router.push('/studio/login'), 3000)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/studio" className="inline-flex items-center gap-1.5 justify-center">
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
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-lime-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-lime-600" />
              </div>
              <h1 className="text-lg font-display font-medium text-charcoal-900 mb-2">
                Password updated
              </h1>
              <p className="text-sm text-warm-500">
                Your password has been reset. Redirecting you to sign in...
              </p>
            </div>
          ) : !sessionReady ? (
            <div className="text-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-warm-400 mx-auto mb-4" />
              <h1 className="text-lg font-display font-medium text-charcoal-900 mb-2">
                Verifying your link
              </h1>
              <p className="text-sm text-warm-500">
                Please wait while we verify your reset link...
              </p>
              <p className="text-xs text-warm-400 mt-4">
                If this takes too long, your link may have expired.{' '}
                <Link href="/studio/forgot-password" className="text-ocean-600 hover:text-ocean-700 font-medium">
                  Request a new one
                </Link>
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-display font-medium text-charcoal-900 mb-1">
                Set a new password
              </h1>
              <p className="text-sm text-warm-500 mb-6">
                Choose a new password for your account.
              </p>

              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="border-warm-200 focus:border-ocean-400 focus:ring-ocean-400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                    minLength={6}
                    autoComplete="new-password"
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
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
