'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { LivePhotoPanel } from '@/components/portal/live-shell'

// Set-password: the landing page for portal invite and password-reset links
// (portal/team, clients/[id]/portal-invite and portal/forgot-password all
// redirect here). On load we exchange the token from the URL for a session,
// then let the user choose a password and drop them into /portal.
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
  const [email, setEmail] = useState<string | null>(null)

  // Exchange the invite/recovery token in the URL for a session. Links arrive
  // in several shapes depending on how they were generated:
  //   #access_token=...&refresh_token=...&type=invite|recovery (implicit; what
  //     admin inviteUserByEmail / generateLink produce). The browser client is
  //     PKCE-only and refuses these, so we set the session ourselves.
  //   ?token_hash=...&type=... (custom email templates) -> verifyOtp
  //   ?code=... (PKCE, same browser) -> usually auto-exchanged on client init
  // URL tokens always win over an existing session so a link opened while
  // someone else is signed in lands on the right account.
  useEffect(() => {
    const supabase = createClient()
    let active = true

    async function bootstrap() {
      const url = new URL(window.location.href)
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
      const query = url.searchParams
      const pick = (k: string) => hash.get(k) ?? query.get(k)

      const linkError = pick('error_description') || pick('error_code') || pick('error')
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      const tokenHash = query.get('token_hash')
      const type = pick('type')
      const code = query.get('code')

      // Waits for client init (which may already have exchanged a ?code=).
      const {
        data: { session: initial },
      } = await supabase.auth.getSession()

      let ok = false
      if (accessToken && refreshToken) {
        const { error: setError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        ok = !setError
      } else if (tokenHash && type) {
        const otpType = ['invite', 'recovery', 'signup', 'magiclink', 'email'].includes(type)
          ? (type as 'invite' | 'recovery' | 'signup' | 'magiclink' | 'email')
          : 'email'
        const { error: otpError } = await supabase.auth.verifyOtp({
          type: otpType,
          token_hash: tokenHash,
        })
        ok = !otpError
      } else if (code) {
        if (initial) {
          ok = true
        } else {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          ok = !exchangeError
        }
      } else if (!linkError) {
        // Already signed in (e.g. the page was refreshed after the link was used).
        ok = Boolean(initial)
      }

      // Keep one-time tokens out of the address bar and browser history.
      if (url.hash || tokenHash || code || linkError) {
        window.history.replaceState(null, '', url.pathname)
      }

      if (!active) return
      if (ok) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!active) return
        if (user) {
          setEmail(user.email ?? null)
          setSessionReady(true)
        }
      }
      setChecking(false)
    }

    bootstrap().catch(() => {
      if (active) setChecking(false)
    })

    return () => {
      active = false
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
                Checking your link.
              </h1>
              <p className="mt-3.5 text-[15px] leading-relaxed text-cream-700">
                One moment while we confirm it.
              </p>
            </div>
          ) : !sessionReady ? (
            <div className="mt-2">
              <h1 className="font-display text-[38px] font-bold leading-[1.05] tracking-[-1.2px] text-foreground">
                This link has expired.
              </h1>
              <p className="mt-3.5 text-[15px] leading-relaxed text-cream-700">
                Links in these emails only work once and for a short time. You can
                send yourself a fresh one below, or email us and we&apos;ll sort it out.
              </p>
              <div className="mt-6 flex flex-col gap-2 text-[13px] text-muted-foreground">
                <Link
                  href="/portal/forgot-password"
                  className="font-semibold text-gold-600 hover:underline"
                >
                  Send me a new link
                </Link>
                <a
                  href="mailto:hello@urbansimple.net?subject=Portal%20access%20help"
                  className="font-semibold text-gold-600 hover:underline"
                >
                  Email hello@urbansimple.net
                </a>
              </div>
            </div>
          ) : (
            <>
              <h1 className="font-display text-[42px] font-bold leading-[1.04] tracking-[-1.3px] text-foreground">
                Set your password.
              </h1>
              <p className="mt-3.5 text-[15px] leading-relaxed text-cream-700">
                Choose a password for your Urban Simple portal
                {email ? <> (<span className="font-semibold text-foreground">{email}</span>)</> : null}.
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
