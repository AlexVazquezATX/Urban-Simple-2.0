'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StaffAuthShell } from '../auth-shell'

// Landing page for staff password-reset emails. Recovery links can arrive as
// an implicit-flow hash (#access_token=...&type=recovery), a PKCE ?code=, or
// a ?token_hash=&type=recovery, so each is handled explicitly (mirrors
// portal/set-password). Once a session exists the user picks a new password.
export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let active = true

    const markReady = () => {
      if (!active) return
      setSessionReady(true)
      setChecking(false)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) markReady()
    })

    async function bootstrap() {
      const url = new URL(window.location.href)
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''))

      // 1. Implicit flow: tokens in the hash.
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
      }

      // 2. PKCE code in the query string.
      const code = url.searchParams.get('code')
      if (code && !accessToken) {
        await supabase.auth.exchangeCodeForSession(code)
      }

      // 3. token_hash + type (recovery link from a custom email template).
      const tokenHash = url.searchParams.get('token_hash')
      const type = url.searchParams.get('type')
      if (tokenHash && type) {
        await supabase.auth.verifyOtp({
          type: type as 'recovery' | 'invite' | 'magiclink' | 'email',
          token_hash: tokenHash,
        })
      }

      // Keep the one-time tokens out of history and screenshots.
      if (accessToken || code || tokenHash) {
        window.history.replaceState(null, '', url.pathname)
      }

      // Supabase may have already picked the session up from the URL, in
      // which case a manual exchange above fails harmlessly.
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        markReady()
        return
      }

      if (active) setChecking(false)
    }

    bootstrap().catch(() => {
      if (active) setChecking(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1200)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <StaffAuthShell>
      {success ? (
        <div className="space-y-4">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-sage-bg text-sage-deep">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-display font-semibold text-charcoal-900 tracking-tight">
            Password updated
          </h1>
          <p className="text-sm text-charcoal-500">Taking you to your dashboard now.</p>
        </div>
      ) : checking ? (
        <div className="space-y-4">
          <Loader2 className="h-6 w-6 animate-spin text-bronze-600" />
          <h1 className="text-2xl font-display font-semibold text-charcoal-900 tracking-tight">
            Checking your link
          </h1>
          <p className="text-sm text-charcoal-500">One moment while we confirm your reset link.</p>
        </div>
      ) : !sessionReady ? (
        <div className="space-y-4">
          <h1 className="text-2xl font-display font-semibold text-charcoal-900 tracking-tight">
            This link has expired
          </h1>
          <p className="text-sm text-charcoal-500 leading-relaxed">
            Reset links only work once, for a short time, and on the device that asked for
            them. Request a new one and open it on this device.
          </p>
          <Button
            asChild
            className="w-full h-11 bg-charcoal-900 hover:bg-charcoal-800 text-cream-100 font-medium text-sm"
          >
            <Link href="/login/forgot">Send a new link</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <h1 className="text-2xl font-display font-semibold text-charcoal-900 tracking-tight">
              Choose a new password
            </h1>
            <p className="text-sm text-charcoal-500">At least 8 characters.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-charcoal-700">
                New password
              </Label>
              <Input
                id="password"
                type="password"
                required
                autoFocus
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-white border-charcoal-200 focus:border-bronze-400 focus:ring-bronze-400/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-charcoal-700">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 bg-white border-charcoal-200 focus:border-bronze-400 focus:ring-bronze-400/20"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-charcoal-900 hover:bg-charcoal-800 text-cream-100 font-medium text-sm"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save and continue'}
            </Button>
          </form>
        </>
      )}
    </StaffAuthShell>
  )
}
