'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StaffAuthShell } from '../auth-shell'

// Staff "Forgot password?". Always shows the same confirmation so the page
// can't be used to check which emails have accounts.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login/reset`,
      })
      if (error) console.error('Password reset request failed:', error.message)
    } catch (error) {
      console.error('Password reset request failed:', error)
    } finally {
      setLoading(false)
      setSent(true)
    }
  }

  return (
    <StaffAuthShell>
      {sent ? (
        <div className="space-y-4">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-sage-bg text-sage-deep">
            <MailCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-display font-semibold text-charcoal-900 tracking-tight">
            Check your email
          </h1>
          <p className="text-sm text-charcoal-500 leading-relaxed">
            If that email has an account, you&apos;ll get a link to reset your password in a
            few minutes. Open it on this device. Don&apos;t see it? Check your spam folder.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm text-bronze-600 hover:text-bronze-700 font-medium"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <h1 className="text-2xl font-display font-semibold text-charcoal-900 tracking-tight">
              Reset your password
            </h1>
            <p className="text-sm text-charcoal-500">
              Enter the email you sign in with and we&apos;ll send you a reset link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                autoFocus
                autoComplete="email"
                className="h-11 bg-white border-charcoal-200 focus:border-bronze-400 focus:ring-bronze-400/20"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-charcoal-900 hover:bg-charcoal-800 text-cream-100 font-medium text-sm"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
            </Button>
          </form>

          <p className="text-center text-sm text-charcoal-500">
            Remembered it?{' '}
            <Link href="/login" className="text-bronze-600 hover:text-bronze-700 font-medium">
              Back to sign in
            </Link>
          </p>
        </>
      )}
    </StaffAuthShell>
  )
}
