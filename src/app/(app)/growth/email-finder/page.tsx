'use client'

import { useState } from 'react'
import {
  Search,
  Building2,
  User,
  Mail,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Save,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ProspectResult {
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
  email_confidence?: number
  email_verified?: boolean
  email_verification_status?: string
  position?: string
  company_name?: string
  domain?: string
  linkedin?: string
  source?: string
  notes?: string
  _saved?: boolean
}

type SearchMode = 'domain' | 'person'

export default function EmailFinderPage() {
  const [searchMode, setSearchMode] = useState<SearchMode>('domain')
  const [domain, setDomain] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ProspectResult[]>([])
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [verifyingEmail, setVerifyingEmail] = useState<string | null>(null)

  const handleDomainSearch = async () => {
    if (!domain.trim()) return

    setLoading(true)
    setError('')
    setResults([])

    try {
      const response = await fetch('/api/growth/email-prospecting/search/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain.trim(),
          method: 'all',
          limit: 25,
          verifyEmails: false,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }

      setResults(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePersonSearch = async () => {
    if (!firstName.trim() || !lastName.trim() || !domain.trim()) return

    setLoading(true)
    setError('')
    setResults([])

    try {
      const response = await fetch('/api/growth/email-prospecting/search/person', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          domain: domain.trim(),
          method: 'all',
          verifyEmail: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Search failed')
      }

      if (data.data) {
        setResults([data.data])
      } else {
        setError('No email found for this person')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const verifyEmail = async (email: string, index: number) => {
    setVerifyingEmail(email)

    try {
      const response = await fetch('/api/growth/email-prospecting/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok && data.data) {
        setResults((prev) =>
          prev.map((p, i) =>
            i === index
              ? {
                  ...p,
                  email_verified: data.data.is_valid,
                  email_verification_status: data.data.is_valid
                    ? 'valid'
                    : data.data.is_catch_all
                      ? 'risky'
                      : 'invalid',
                  email_confidence: Math.round(data.data.quality_score),
                }
              : p
          )
        )
      }
    } catch (err) {
      console.error('Verification failed:', err)
    } finally {
      setVerifyingEmail(null)
    }
  }

  const saveProspect = async (prospect: ProspectResult, index: number) => {
    setSavingId(`${index}`)

    try {
      const response = await fetch('/api/growth/prospects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: prospect.company_name || prospect.domain || 'Unknown',
          website: prospect.domain ? `https://${prospect.domain}` : undefined,
          source: 'manual',
          sourceDetail: `Email Finder - ${prospect.source}`,
          status: 'new',
          contacts: prospect.email
            ? [
                {
                  firstName: prospect.first_name || '',
                  lastName: prospect.last_name || '',
                  email: prospect.email,
                  title: prospect.position,
                  role: 'primary',
                  isDecisionMaker: false,
                },
              ]
            : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 409) {
          alert('This prospect already exists in your database')
        } else {
          throw new Error(data.error)
        }
        return
      }

      // Mark as saved in UI
      setResults((prev) =>
        prev.map((p, i) => (i === index ? { ...p, _saved: true } : p))
      )
    } catch (err) {
      console.error('Save failed:', err)
      alert('Failed to save prospect')
    } finally {
      setSavingId(null)
    }
  }

  const getConfidenceBadge = (
    confidence?: number,
    verified?: boolean,
    status?: string
  ) => {
    if (verified && status === 'valid') {
      return (
        <Badge
          variant="outline"
          className="bg-sage-50 text-sage-700 border-sage-200"
        >
          <CheckCircle className="w-3 h-3 mr-1" /> Verified
        </Badge>
      )
    }
    if (status === 'invalid') {
      return (
        <Badge
          variant="outline"
          className="bg-terracotta-50 text-terracotta-700 border-terracotta-200"
        >
          <XCircle className="w-3 h-3 mr-1" /> Invalid
        </Badge>
      )
    }
    if (status === 'risky') {
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200"
        >
          <AlertTriangle className="w-3 h-3 mr-1" /> Risky
        </Badge>
      )
    }
    if (confidence !== undefined) {
      const color =
        confidence >= 70
          ? 'bg-sage-50 text-sage-700 border-sage-200'
          : confidence >= 40
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-warm-100 text-warm-600 border-warm-200'
      return (
        <Badge variant="outline" className={color}>
          {confidence}% confidence
        </Badge>
      )
    }
    return null
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto bg-warm-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-semibold text-warm-900">
          Email Finder
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          Search for contacts at any company or find a specific person&apos;s email
        </p>
      </div>

      {/* Search Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={searchMode === 'domain' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSearchMode('domain')}
          className={cn(
            'rounded-sm',
            searchMode === 'domain' && 'bg-bronze-600 hover:bg-bronze-700'
          )}
        >
          <Building2 className="w-4 h-4 mr-2" />
          Company Search
        </Button>
        <Button
          variant={searchMode === 'person' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSearchMode('person')}
          className={cn(
            'rounded-sm',
            searchMode === 'person' && 'bg-bronze-600 hover:bg-bronze-700'
          )}
        >
          <User className="w-4 h-4 mr-2" />
          Person Search
        </Button>
      </div>

      {/* Search Form */}
      <Card className="rounded-sm border-warm-200 mb-6">
        <CardContent className="p-4">
          {searchMode === 'domain' ? (
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Enter company domain (e.g., marriott.com)"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDomainSearch()}
                  className="pl-10 rounded-sm border-warm-200"
                />
              </div>
              <Button
                onClick={handleDomainSearch}
                disabled={loading || !domain.trim()}
                className="rounded-sm bg-bronze-600 hover:bg-bronze-700"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Search
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-warm-600 mb-1">
                    First Name
                  </label>
                  <Input
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="rounded-sm border-warm-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-warm-600 mb-1">
                    Last Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Smith"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="rounded-sm border-warm-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-warm-600 mb-1">
                  Company Domain
                </label>
                <div className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="marriott.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePersonSearch()}
                    className="flex-1 rounded-sm border-warm-200"
                  />
                  <Button
                    onClick={handlePersonSearch}
                    disabled={
                      loading ||
                      !firstName.trim() ||
                      !lastName.trim() ||
                      !domain.trim()
                    }
                    className="rounded-sm bg-bronze-600 hover:bg-bronze-700"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Search className="w-4 h-4 mr-2" />
                    )}
                    Find Email
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-terracotta-50 text-terracotta-700 rounded-sm border border-terracotta-200 flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card className="rounded-sm border-warm-200">
          <CardHeader className="p-4 border-b border-warm-100 bg-warm-50/50">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base font-display font-semibold text-warm-900">
                  {results[0]?.company_name || domain}
                </CardTitle>
                <p className="text-xs text-warm-500 mt-0.5">
                  {results.length} contact(s) found
                </p>
              </div>
              <div className="text-xs text-warm-400">
                Sources: {[...new Set(results.map((r) => r.source))].join(', ')}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-warm-100">
              {results.map((prospect, index) => (
                <div
                  key={prospect.email || index}
                  className={cn(
                    'p-4 flex items-center justify-between hover:bg-warm-50/50 transition-colors',
                    prospect._saved && 'bg-sage-50/50'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-warm-900 text-sm">
                      {prospect.full_name ||
                        `${prospect.first_name || ''} ${prospect.last_name || ''}`.trim() ||
                        'Unknown'}
                    </div>
                    {prospect.position && (
                      <div className="text-xs text-warm-500">{prospect.position}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <div className="flex items-center gap-1 text-xs text-warm-600">
                        <Mail className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">{prospect.email}</span>
                      </div>
                      {getConfidenceBadge(
                        prospect.email_confidence,
                        prospect.email_verified,
                        prospect.email_verification_status
                      )}
                      <span className="text-[10px] text-warm-400">
                        via {prospect.source}
                      </span>
                    </div>
                    {prospect.linkedin && (
                      <a
                        href={prospect.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-ocean-600 hover:underline flex items-center gap-1 mt-1"
                      >
                        <ExternalLink className="w-3 h-3" /> LinkedIn
                      </a>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0 ml-4">
                    {!prospect.email_verified && prospect.email && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => verifyEmail(prospect.email!, index)}
                        disabled={verifyingEmail === prospect.email}
                        className="rounded-sm border-warm-200 text-xs h-7"
                      >
                        {verifyingEmail === prospect.email ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Verify
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant={prospect._saved ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => saveProspect(prospect, index)}
                      disabled={savingId === `${index}` || prospect._saved}
                      className={cn(
                        'rounded-sm text-xs h-7',
                        prospect._saved
                          ? 'bg-sage-50 text-sage-700 border-sage-200'
                          : 'bg-bronze-600 hover:bg-bronze-700'
                      )}
                    >
                      {savingId === `${index}` ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : prospect._saved ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Save className="w-3 h-3 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state when no results yet */}
      {!loading && results.length === 0 && !error && (
        <Card className="rounded-sm border-warm-200 border-dashed">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-warm-100 flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-warm-400" />
            </div>
            <h3 className="font-medium text-warm-900 text-sm">
              Search for prospects
            </h3>
            <p className="text-xs text-warm-500 mt-1 max-w-sm mx-auto">
              {searchMode === 'domain'
                ? 'Enter a company domain to find contacts and their email addresses'
                : "Enter a person's name and company domain to find their email"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
