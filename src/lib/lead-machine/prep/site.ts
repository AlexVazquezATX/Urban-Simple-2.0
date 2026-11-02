// Reads a business's own website: the emails it publishes and enough visible
// text (about page, homepage) for the research step to learn who runs it and
// what they care about. Three pages at most, in parallel, short timeouts.

import type { FetchLike } from '../sources/types'

// Listing and booking sites aren't the business's own domain: no emails to
// find there, and Findymail can't search them.
const NOT_OWN_SITE = /(^|\.)(facebook|instagram|linktr|yelp|tripadvisor|opentable|resy|toasttab|square|squareup|google|doordash|ubereats|grubhub|tiktok|x|twitter|exploretock|sevenrooms|wixsite|godaddysites|business\.site|marriott|hilton|hyatt|ihg|choicehotels|wyndhamhotels|bestwestern|fourseasons|ritzcarlton|aubergeresorts|kimptonhotels|omnihotels|loewshotels|fairmont|accor|radissonhotels|graduatehotels|virginhotels|thompsonhotels|jdvhotels|sonder|aparium|lhw|preferredhotels|marriottvacationclub)\./i
const FREEMAIL = new Set(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'me.com', 'live.com'])
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
const JUNK_EMAIL = /\.(png|jpe?g|gif|webp|svg)$|^(example|test|user|name|email|your)@|@(example|domain|email|sentry|wixpress|sentry-next)\./i

export type SiteFacts = {
  url: string
  domain: string
  emails: string[]
  text: string
  pagesRead: number
}

/** "https://www.foo.com/menu" -> "foo.com"; null for social/booking/chain sites. */
export function ownDomain(website: string | null | undefined): string | null {
  if (!website) return null
  try {
    const host = new URL(website.startsWith('http') ? website : `https://${website}`).hostname.toLowerCase().replace(/^www\./, '')
    if (NOT_OWN_SITE.test(`${host}.`) || NOT_OWN_SITE.test(host)) return null
    return host
  } catch {
    return null
  }
}

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|nav|footer)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|h[1-6]|li|section)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n\s*\n+/g, '\n')
    .trim()
}

/** Emails a page publishes: its own domain anywhere, free-mail only as a mailto link. */
export function extractEmails(html: string, domain: string): string[] {
  const out = new Set<string>()
  const decode = (s: string) => {
    try {
      return decodeURIComponent(s)
    } catch {
      return s
    }
  }
  const mailtos = new Set([...html.matchAll(/mailto:([^"'?>\s]+)/gi)].map((m) => decode(m[1]).toLowerCase()))
  for (const raw of [...(html.match(EMAIL) ?? []), ...mailtos]) {
    const email = raw.toLowerCase().replace(/^\.+|\.+$/g, '')
    if (JUNK_EMAIL.test(email)) continue
    const host = email.split('@')[1]
    if (host === domain || host.endsWith(`.${domain}`) || (FREEMAIL.has(host) && mailtos.has(email))) out.add(email)
  }
  return [...out]
}

async function getPage(fetchImpl: FetchLike, url: string): Promise<string | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8_000)
  try {
    const res = await fetchImpl(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UrbanSimpleBot/1.0; +https://www.urbansimple.net)', Accept: 'text/html' },
    })
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) return null
    return (await res.text()).slice(0, 600_000)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function readSite(website: string, opts: { fetchImpl?: FetchLike } = {}): Promise<SiteFacts | null> {
  const domain = ownDomain(website)
  if (!domain) return null
  const fetchImpl = opts.fetchImpl ?? fetch
  const base = `https://${website.toLowerCase().includes('www.') ? 'www.' : ''}${domain}`
  const [home, about, contact] = await Promise.all(
    ['/', '/about', '/contact'].map((p) => getPage(fetchImpl, `${base}${p}`)),
  )
  const pages = [about, home, contact].filter((p): p is string => !!p)
  if (pages.length === 0) return null
  const emails = [...new Set(pages.flatMap((p) => extractEmails(p, domain)))]
  // About first (who runs it, their story), then the homepage pitch.
  const text = pages.map(htmlToText).join('\n---\n').slice(0, 6_000)
  return { url: base, domain, emails, text, pagesRead: pages.length }
}
