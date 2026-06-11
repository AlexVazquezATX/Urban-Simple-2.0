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
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
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
        <Badge variant="green">
          <CheckCircle className="w-3 h-3 mr-1" /> Verified
        </Badge>
      )
    }
    if (status === 'invalid') {
      return (
        <Badge variant="coral">
          <XCircle className="w-3 h-3 mr-1" /> Invalid
        </Badge>
      )
    }
    if (status === 'risky') {
      return (
        <Badge variant="gold">
          <AlertTriangle className="w-3 h-3 mr-1" /> Risky
        </Badge>
      )
    }
    if (confidence !== undefined) {
      const tone =
        confidence >= 70 ? 'green' : confidence >= 40 ? 'gold' : 'neutral'
      return (
        <Badge variant={tone}>
          {confidence}% confidence
        </Badge>
      )
    }
    return null
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto bg-background min-h-screen">
      <PageHeader
        kicker="GROWTH · EMAIL FINDER"
        title="Email Finder"
        subtitle="Search for contacts at any company or find a specific person's email"
      />

      {/* Search Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={searchMode === 'domain' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setSearchMode('domain')}
        >
          <Building2 className="w-4 h-4 mr-2" />
          Company Search
        </Button>
        <Button
          variant={searchMode === 'person' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setSearchMode('person')}
        >
          <User className="w-4 h-4 mr-2" />
          Person Search
        </Button>
      </div>

      {/* Search Form */}
      <Card className="mb-6">
        <CardContent className="p-4">
          {searchMode === 'domain' ? (
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Enter company domain (e.g., marriott.com)"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDomainSearch()}
                  className="pl-10"
                />
              </div>
              <Button
                onClick={handleDomainSearch}
                disabled={loading || !domain.trim()}
                variant="gold"
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
                  <Label className="mb-1 block">First Name</Label>
                  <Input
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="mb-1 block">Last Name</Label>
                  <Input
                    type="text"
                    placeholder="Smith"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1 block">Company Domain</Label>
                <div className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="marriott.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePersonSearch()}
                    className="flex-1"
                  />
                  <Button
                    onClick={handlePersonSearch}
                    disabled={
                      loading ||
                      !firstName.trim() ||
                      !lastName.trim() ||
                      !domain.trim()
                    }
                    variant="gold"
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
        <div className="mb-4 p-3 rounded-[12px] border bg-coral-600/10 border-coral-600/30 text-coral-600 dark:bg-coral-300/12 dark:border-coral-300/25 dark:text-coral-300 flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="p-4 border-b border-border bg-secondary/50">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base">
                  {results[0]?.company_name || domain}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {results.length} contact(s) found
                </p>
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                Sources: {[...new Set(results.map((r) => r.source))].join(', ')}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {results.map((prospect, index) => (
                <div
                  key={prospect.email || index}
                  className={cn(
                    'p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors',
                    prospect._saved && 'bg-green-600/10 dark:bg-green-300/12'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground text-sm">
                      {prospect.full_name ||
                        `${prospect.first_name || ''} ${prospect.last_name || ''}`.trim() ||
                        'Unknown'}
                    </div>
                    {prospect.position && (
                      <div className="text-xs text-muted-foreground">{prospect.position}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">{prospect.email}</span>
                      </div>
                      {getConfidenceBadge(
                        prospect.email_confidence,
                        prospect.email_verified,
                        prospect.email_verification_status
                      )}
                      <span className="text-[10px] font-mono text-muted-foreground">
                        via {prospect.source}
                      </span>
                    </div>
                    {prospect.linkedin && (
                      <a
                        href={prospect.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-teal-600 dark:text-teal-300 hover:underline flex items-center gap-1 mt-1"
                      >
                        <ExternalLink className="w-3 h-3" /> LinkedIn
                      </a>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0 ml-4">
                    {!prospect.email_verified && prospect.email && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => verifyEmail(prospect.email!, index)}
                        disabled={verifyingEmail === prospect.email}
                        className="text-xs h-7"
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
                      variant="outline"
                      size="sm"
                      onClick={() => saveProspect(prospect, index)}
                      disabled={savingId === `${index}` || prospect._saved}
                      className={cn(
                        'text-xs h-7',
                        prospect._saved && 'text-green-600 dark:text-green-300'
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
        <Card className="border-dashed">
          <CardContent className="p-4">
            <EmptyState
              icon={Search}
              title="Your next contact is one search away"
              description={
                searchMode === 'domain'
                  ? 'Enter a company domain to find contacts and their email addresses'
                  : "Enter a person's name and company domain to find their email"
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
