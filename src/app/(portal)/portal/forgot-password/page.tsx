'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LivePhotoPanel } from '@/components/portal/live-shell'

// Forgot password: same split layout as the portal login. Posts to
// /api/portal/forgot-password, which always answers generically.

export default function PortalForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sentMessage, setSentMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/portal/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Something went wrong. Please try again.')
      setSentMessage(payload.message || 'Check your inbox for a reset link.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
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

          {sentMessage ? (
            <>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-sage-bg text-sage-deep">
                <MailCheck className="h-6 w-6" />
              </div>
              <h1 className="mt-5 font-display text-[38px] font-bold leading-[1.05] tracking-[-1.2px] text-foreground">
                Check your email.
              </h1>
              <p className="mt-3.5 text-[15px] leading-relaxed text-cream-700">{sentMessage}</p>
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                Nothing showing up? Check your spam folder, or email{' '}
                <a
                  href="mailto:hello@urbansimple.net?subject=Portal%20sign-in%20help"
                  className="font-semibold text-gold-600 hover:underline"
                >
                  hello@urbansimple.net
                </a>
                .
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-[42px] font-bold leading-[1.04] tracking-[-1.3px] text-foreground">
                Reset your password.
              </h1>
              <p className="mt-3.5 text-[15px] leading-relaxed text-cream-700">
                Enter the email you use for the portal and we&apos;ll send you a link to
                choose a new password.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourrestaurant.com"
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
                  Send reset link
                </Button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            <Link href="/portal/login" className="font-semibold text-gold-600 hover:underline">
              Back to sign in
            </Link>
          </p>

          <div className="mt-14 border-t border-border pt-5 font-mono text-[10px] uppercase tracking-[1.8px] text-muted-foreground">
            Urban Simple · We clean while you sleep
          </div>
        </div>
      </div>
    </div>
  )
}
