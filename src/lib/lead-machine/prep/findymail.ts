// Findymail: finds a named person's work email and verifies addresses.
// Finder credits are only charged when an email is found; every verify costs
// one verifier credit. The usage counter lets the run log stay honest about
// what was spent, failed runs included.

import type { FetchLike } from '../sources/types'

const BASE = 'https://app.findymail.com'

export type FindymailUsage = { finds: number; verifies: number; employeeLookups: number }

export type Employee = { name: string; jobTitle: string | null; linkedinUrl: string | null }

/** Thrown when Findymail says the account can't do more (no credits, paused). */
export class FindymailStopped extends Error {}

export class Findymail {
  readonly usage: FindymailUsage = { finds: 0, verifies: 0, employeeLookups: 0 }

  constructor(
    private apiKey: string,
    private budget: { remaining: number },
    private fetchImpl: FetchLike = fetch,
  ) {}

  get remaining() {
    return this.budget.remaining
  }

  private async call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<{ status: number; json: T | null }> {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15_000)
    try {
      const res = await this.fetchImpl(`${BASE}${path}`, {
        method,
        signal: ctrl.signal,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      if (res.status === 401) throw new FindymailStopped('Findymail rejected the API key (401)')
      if (res.status === 402) throw new FindymailStopped('Findymail is out of credits (402)')
      if (res.status === 423) throw new FindymailStopped('Findymail subscription is paused (423)')
      if (res.status === 404) return { status: 404, json: null }
      if (!res.ok) throw new Error(`Findymail ${path} returned HTTP ${res.status}`)
      return { status: res.status, json: (await res.json()) as T }
    } finally {
      clearTimeout(timer)
    }
  }

  private spend(): boolean {
    if (this.budget.remaining <= 0) return false
    this.budget.remaining--
    return true
  }

  /** A verified work email for a full name at a domain, or null. */
  async findByName(name: string, domain: string): Promise<string | null> {
    if (!this.spend()) return null
    const { json } = await this.call<{ contact?: { email?: string | null } | null }>('POST', '/api/search/name', { name, domain })
    const email = json?.contact?.email?.trim() || null
    if (email) this.usage.finds++
    else this.budget.remaining++ // nothing found costs nothing
    return email
  }

  /** People at a company website holding one of the titles (no emails). */
  async findEmployees(website: string, jobTitles: string[], count = 1): Promise<Employee[]> {
    if (!this.spend()) return []
    const { json } = await this.call<Array<{ name?: string; jobTitle?: string; linkedinUrl?: string }>>(
      'POST',
      '/api/search/employees',
      { website, job_titles: jobTitles.slice(0, 10), count: Math.min(3, count) },
    )
    const people = (Array.isArray(json) ? json : [])
      .filter((p) => p.name?.trim())
      .map((p) => ({ name: p.name!.trim(), jobTitle: p.jobTitle?.trim() || null, linkedinUrl: p.linkedinUrl?.trim() || null }))
    // Charged per employee returned; the one credit reserved covers the first.
    this.usage.employeeLookups += people.length
    if (people.length === 0) this.budget.remaining++
    else this.budget.remaining -= people.length - 1
    return people
  }

  /** true = deliverable, false = not confirmed (bad or catch-all), null = no budget. */
  async verify(email: string): Promise<boolean | null> {
    if (!this.spend()) return null
    this.usage.verifies++
    const { json } = await this.call<{ verified?: boolean }>('POST', '/api/verify', { email })
    return json?.verified === true
  }

  async credits(): Promise<{ finder: number | null; verifier: number | null }> {
    const { json } = await this.call<{ credits?: number; verifier_credits?: number }>('GET', '/api/credits')
    return {
      finder: typeof json?.credits === 'number' ? json.credits : null,
      verifier: typeof json?.verifier_credits === 'number' ? json.verifier_credits : null,
    }
  }
}
