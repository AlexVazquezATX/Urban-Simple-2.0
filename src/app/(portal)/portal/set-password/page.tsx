'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { LivePhotoPanel } from '@/components/portal/live-shell'

// Set-password — the landing page for portal invite links. Both invite flows
// (portal/team and clients/[id]/portal-invite) point Supabase's invite email
// here. On load we exchange the invite/recovery token from the URL for a
// session, then let the invitee choose a password and drop them into /portal.
// Mirrors the studio/reset-password token-exchange precedent, styled to match
// the portal login split layout.

export default function PortalSetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordContent />
    </Suspense>
  )
}

function SetPasswordContent() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [checking, setChecking] = useState(true)

  // Exchange the invite/recovery token in the URL for a session. supabase-js
  // (createBrowserClient) auto-detects a session from the URL, but invite links
  // can arrive as a PKCE ?code=, a ?token_hash=&type=, or an implicit-flow hash,
  // so we handle each explicitly and also listen for the auth state change.
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
      // 1. Session already established (auto-detected from the URL).
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        markReady()
        return
      }

      const url = new URL(window.location.href)

      // 2. PKCE code in the query string.
      const code = url.searchParams.get('code')
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (!exchangeError) {
          markReady()
          return
        }
      }

      // 3. token_hash + type (invite / recovery magic link).
      const tokenHash = url.searchParams.get('token_hash')
      const type = url.searchParams.get('type')
      if (tokenHash && type) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          type: type as 'invite' | 'recovery' | 'signup' | 'magiclink' | 'email',
          token_hash: tokenHash,
        })
        if (!otpError) {
          markReady()
          return
        }
      }

      // Nothing worked — the link is invalid or already used.
      if (active) setChecking(false)
    }

    bootstrap()

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
        router.push('/portal')
        router.refresh()
      }, 1500)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-cream-50 font-sans text-foreground">
      <LivePhotoPanel
        photoUrl={null}
        photoAlt="Your kitchen at its best"
        brandName="Urban Simple"
        pill="We clean while you sleep"
      />

      <div className="flex min-w-0 flex-1 flex-col justify-center px-7 py-14 sm:px-[clamp(48px,7vw,120px)]">
        <div className="w-full max-w-[400px]">
          <div className="mb-3.5 font-mono text-[11px] uppercase tracking-[2.4px] text-gold-600">
            Urban Simple · Client Portal
          </div>

          {success ? (
            <div className="mt-2">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-sage-bg text-sage-deep">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h1 className="mt-5 font-display text-[38px] font-bold leading-[1.05] tracking-[-1.2px] text-foreground">
                You&apos;re all set.
              </h1>
              <p className="mt-3.5 text-[15px] leading-relaxed text-cream-700">
                Your password is saved. Taking you to your portal now.
              </p>
            </div>
          ) : checking ? (
            <div className="mt-2">
              <Loader2 className="h-6 w-6 animate-spin text-gold-600" />
              <h1 className="mt-5 font-display text-[38px] font-bold leading-[1.05] tracking-[-1.2px] text-foreground">
                Verifying your invite.
              </h1>
              <p className="mt-3.5 text-[15px] leading-relaxed text-cream-700">
                One moment while we confirm your invite link.
              </p>
            </div>
          ) : !sessionReady ? (
            <div className="mt-2">
              <h1 className="font-display text-[38px] font-bold leading-[1.05] tracking-[-1.2px] text-foreground">
                This link has expired.
              </h1>
              <p className="mt-3.5 text-[15px] leading-relaxed text-cream-700">
                Invite links are only good for a short window. Ask whoever invited
                you to send a fresh one, or email us and we&apos;ll sort it out.
              </p>
              <p className="mt-6 text-[13px] text-muted-foreground">
                <a
                  href="mailto:hello@urbansimple.net?subject=Portal%20invite%20help"
                  className="font-semibold text-gold-600 hover:underline"
                >
                  Email us for a new invite
                </a>
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-[42px] font-bold leading-[1.04] tracking-[-1.3px] text-foreground">
                Set your password.
              </h1>
              <p className="mt-3.5 text-[15px] leading-relaxed text-cream-700">
                Choose a password to finish setting up your Urban Simple portal.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    autoFocus
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="h-12 rounded-xl bg-card px-4 text-[14.5px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-12 rounded-xl bg-card px-4 text-[14.5px]"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-peach-line bg-peach-bg p-3 text-sm text-peach-deep">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="gold"
                  disabled={loading}
                  className="mt-2 h-12 w-full rounded-full text-[15px] font-semibold"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Set password and continue
                </Button>
              </form>
            </>
          )}

          <div className="mt-14 border-t border-border pt-5 font-mono text-[10px] uppercase tracking-[1.8px] text-muted-foreground">
            Urban Simple · We clean while you sleep
          </div>
        </div>
      </div>
    </div>
  )
}
