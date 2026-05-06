'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
    <div className="flex min-h-screen items-center justify-center bg-cream-50 p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-sm bg-lime-100 text-lime-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900">
            Start your 14-day free trial
          </h1>
          <p className="mt-1 text-sm text-warm-500">
            No credit card required. Get your hospitality ops binder in under 60 seconds.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 rounded-sm border border-warm-200 bg-white p-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="business-name">Business name *</Label>
              <Input
                id="business-name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Tarka Indian Kitchen"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="business-type">Type</Label>
              <select
                id="business-type"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="h-10 w-full rounded-sm border border-warm-200 bg-white px-3 text-sm text-warm-900"
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
            <div className="space-y-1.5">
              <Label htmlFor="first">First name *</Label>
              <Input
                id="first"
                value={ownerFirstName}
                onChange={(e) => setOwnerFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last">Last name</Label>
              <Input
                id="last"
                value={ownerLastName}
                onChange={(e) => setOwnerLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourrestaurant.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <p className="text-[10px] text-warm-500">8+ characters.</p>
          </div>

          {error && (
            <div className="rounded-sm border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" disabled={submitting} className="w-full rounded-sm" size="lg">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating your account...
              </>
            ) : (
              'Start free trial'
            )}
          </Button>

          <p className="text-center text-[11px] text-warm-500">
            By signing up you agree to our terms.{' '}
            <Link href="/portal/login" className="text-ocean-600 hover:underline">
              Already have an account?
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
