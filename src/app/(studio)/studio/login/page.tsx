'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function StudioLoginPage() {
  return (
    <Suspense>
      <StudioLoginContent />
    </Suspense>
  )
}

function StudioLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const justSignedUp = searchParams.get('registered') === 'true'

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

      router.push('/studio')
      router.refresh()
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
              src="/images/BackHaus Logos/Backhaus Logo - Black3-Compact.png"
              alt="BackHaus"
              width={200}
              height={40}
              className="h-8 w-auto opacity-70"
              priority
            />
            <span className="w-2 h-2 rounded-full bg-amber-500 mb-0.5" />
          </Link>
          <p className="text-sm text-warm-500 mt-3">
            AI-powered food photography & branded content
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-sm border border-warm-200 p-6">
          <h1 className="text-lg font-display font-medium text-charcoal-900 mb-1">
            Sign in to your account
          </h1>
          <p className="text-sm text-warm-500 mb-6">
            Welcome back to your creative studio
          </p>

          {justSignedUp && (
            <div className="rounded-md bg-lime-50 border border-lime-200 p-3 text-sm text-lime-700 mb-4">
              Account created! Sign in to get started.
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
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
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
                autoComplete="current-password"
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
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </div>

        {/* Footer links */}
        <div className="text-center mt-4 space-y-2">
          <p className="text-sm text-warm-500">
            Don&apos;t have an account?{' '}
            <Link href="/studio/signup" className="text-ocean-600 hover:text-ocean-700 font-medium">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
