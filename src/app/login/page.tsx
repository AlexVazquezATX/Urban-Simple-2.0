'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

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

    router.push('/dashboard')
    router.refresh()
  }

  const handleGoogleLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-charcoal-900 overflow-hidden">
        {/* Background image */}
        <Image
          src="/images/Services-1767818882/service_Hotels-Hospitality-01.jpg"
          alt=""
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/95 via-charcoal-900/80 to-charcoal-900/65" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link href="/" className="flex items-center gap-1">
            <Image
              src="/images/Urban Simple Logos/Urban Simple Icon.png"
              alt=""
              width={44}
              height={44}
              className="h-11 w-11"
            />
            <div className="flex items-baseline gap-0.5">
              <span className="font-bold text-3xl tracking-tight text-white">
                Urban
              </span>
              <span className="font-display italic font-normal text-3xl text-bronze-400">
                Simple
              </span>
            </div>
          </Link>

          <div className="space-y-6">
            <h1 className="text-4xl xl:text-5xl font-display font-semibold text-cream-100 leading-tight tracking-tight">
              Business management,{' '}
              <span className="text-bronze-400">simplified.</span>
            </h1>
            <p className="text-lg text-charcoal-400 max-w-md leading-relaxed">
              One intelligent platform to manage clients, invoices, operations, and growth — powered by AI.
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm text-charcoal-500">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-bronze-600 border-2 border-charcoal-900 flex items-center justify-center text-xs text-cream-100 font-medium">A</div>
              <div className="w-8 h-8 rounded-full bg-sage-500 border-2 border-charcoal-900 flex items-center justify-center text-xs text-cream-100 font-medium">M</div>
              <div className="w-8 h-8 rounded-full bg-charcoal-600 border-2 border-charcoal-900 flex items-center justify-center text-xs text-cream-100 font-medium">J</div>
            </div>
            <span>Trusted by growing businesses</span>
          </div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-cream-50 p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-display font-semibold text-charcoal-900 tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-charcoal-500">
              Sign in to your account to continue
            </p>
          </div>

          {/* Google sign-in */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 border-charcoal-200 bg-white hover:bg-cream-100 text-charcoal-700 font-medium gap-3"
            onClick={handleGoogleLogin}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-charcoal-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-cream-50 px-3 text-charcoal-400 uppercase tracking-wider">or</span>
            </div>
          </div>

          {/* Email/password form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-charcoal-700">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 bg-white border-charcoal-200 focus:border-bronze-400 focus:ring-bronze-400/20"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-charcoal-700">
                  Password
                </Label>
                <button
                  type="button"
                  className="text-xs text-bronze-600 hover:text-bronze-700 font-medium"
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11 bg-white border-charcoal-200 focus:border-bronze-400 focus:ring-bronze-400/20"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-charcoal-900 hover:bg-charcoal-800 text-cream-100 font-medium text-sm"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-charcoal-500">
            Don&apos;t have an account?{' '}
            <a href="mailto:hello@urbansimple.net" className="text-bronze-600 hover:text-bronze-700 font-medium">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
