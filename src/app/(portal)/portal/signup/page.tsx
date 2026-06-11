'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LivePhotoPanel } from '@/components/portal/live-shell'

// Portal signup — same split-photo treatment as LiveLogin, with the trial
// form on the right. All signup + auto sign-in logic preserved.

export default function PortalSignupPage() {
  return (
    <Suspense>
      <PortalSignupContent />
    </Suspense>
  )
}

function PortalSignupContent() {
  const router = useRouter()
  const params = useSearchParams()

  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('Restaurant')
  const [ownerFirstName, setOwnerFirstName] = useState('')
  const [ownerLastName, setOwnerLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const planFromUrl = params.get('plan')
  const plan = planFromUrl === 'pro' ? 'pro' : 'starter'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/portal/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          businessType,
          ownerFirstName,
          ownerLastName,
          email,
          password,
          plan,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Signup failed')

      // Auto sign-in via Supabase using the password they just set.
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        toast.success('Account created. Sign in to continue.')
        router.push('/portal/login?invited=true')
        return
      }

      toast.success(`Welcome to the portal, ${ownerFirstName}.`)
      router.push('/portal')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Signup failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-cream-50 font-sans text-foreground">
      <LivePhotoPanel
        photoUrl={null}
        photoAlt="Your kitchen at its best"
        brandName="Urban Simple"
        pill="Inspection-ready in under 60 seconds"
      />

      <div className="flex min-w-0 flex-1 flex-col justify-center px-7 py-14 sm:px-[clamp(48px,7vw,120px)]">
        <div className="w-full max-w-[440px]">
          <div className="mb-3.5 font-mono text-[11px] uppercase tracking-[2.4px] text-gold-600">
            Urban Simple · Client Portal
          </div>
          <h1 className="font-display text-[38px] font-bold leading-[1.06] tracking-[-1.2px] text-foreground">
            Start your 14-day free trial.
          </h1>
          <p className="mt-3.5 text-[15px] leading-relaxed text-cream-700">
            No credit card required. Get your hospitality ops binder in under 60 seconds.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="business-name">Business name *</Label>
                <Input
                  id="business-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Tarka Indian Kitchen"
                  required
                  className="h-11 rounded-xl bg-card"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-type">Type</Label>
                <select
                  id="business-type"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option>Restaurant</option>
                  <option>Bar</option>
                  <option>Hotel</option>
                  <option>Coffee Shop</option>
                  <option>Event Space</option>
                  <option>Multi-location group</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="first">First name *</Label>
                <Input
                  id="first"
                  value={ownerFirstName}
                  onChange={(e) => setOwnerFirstName(e.target.value)}
                  required
                  className="h-11 rounded-xl bg-card"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last">Last name</Label>
                <Input
                  id="last"
                  value={ownerLastName}
                  onChange={(e) => setOwnerLastName(e.target.value)}
                  className="h-11 rounded-xl bg-card"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourrestaurant.com"
                required
                className="h-11 rounded-xl bg-card"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                className="h-11 rounded-xl bg-card"
              />
              <p className="text-[10px] text-muted-foreground">8+ characters.</p>
            </div>

            {error && (
              <div className="rounded-2xl border border-peach-line bg-peach-bg p-3 text-sm text-peach-deep">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="gold"
              disabled={submitting}
              className="h-12 w-full rounded-full text-[15px] font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating your account...
                </>
              ) : (
                'Start free trial'
              )}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground">
              By signing up you agree to our terms.{' '}
              <Link href="/portal/login" className="font-semibold text-gold-600 hover:underline">
                Already have an account?
              </Link>
            </p>
          </form>

          <div className="mt-12 border-t border-border pt-5 font-mono text-[10px] uppercase tracking-[1.8px] text-muted-foreground">
            Urban Simple · We clean while you sleep
          </div>
        </div>
      </div>
    </div>
  )
}
