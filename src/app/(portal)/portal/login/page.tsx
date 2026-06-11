'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { LivePhotoPanel } from '@/components/portal/live-shell'

// Portal login — LiveLogin spec (usp-live-home.jsx): split photo panel left,
// right column with mono gold kicker, "Welcome back." display, mono-labeled
// fields, gold pill Sign in, and the mono brand footer.

export default function PortalLoginPage() {
  return (
    <Suspense>
      <PortalLoginContent />
    </Suspense>
  )
}

function PortalLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const justInvited = searchParams.get('invited') === 'true'

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      router.push('/portal')
      router.refresh()
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
          <h1 className="font-display text-[42px] font-bold leading-[1.04] tracking-[-1.3px] text-foreground">
            Welcome back.
          </h1>
          <p className="mt-3.5 text-[15px] leading-relaxed text-cream-700">
            Sign in to see last night&apos;s visit, photos, and what&apos;s scheduled next.
          </p>

          {justInvited && (
            <div className="mt-6 rounded-2xl border border-sage-line bg-sage-bg p-3.5 text-sm text-sage-deep">
              You&apos;ve been invited. Sign in with the password you set from your invite email.
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourrestaurant.com"
                className="h-12 rounded-xl bg-card px-4 text-[14.5px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              Sign in
            </Button>
          </form>

          <p className="mt-4.5 pt-4 text-center text-[13px] text-muted-foreground">
            Forgot your password?{' '}
            <a
              href="mailto:hello@urbansimple.net?subject=Portal%20sign-in%20help"
              className="font-semibold text-gold-600 hover:underline"
            >
              Email us for a sign-in link
            </a>
          </p>

          <div className="mt-14 border-t border-border pt-5 font-mono text-[10px] uppercase tracking-[1.8px] text-muted-foreground">
            Urban Simple · We clean while you sleep
          </div>
        </div>
      </div>
    </div>
  )
}
