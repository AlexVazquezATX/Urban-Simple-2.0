// OAuth consent screen — the human step of connecting an MCP client (claude.ai,
// Claude Code, …) to the Urban Simple backend.
//
// Flow: client → GET /oauth/authorize?… → (not signed in? bounce via /login?next=)
// → this page (SUPER_ADMIN only) → Approve/Deny → POST /api/oauth/authorize →
// 302 back to the client with a one-time code.

import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { AUTHORIZE_PARAM_KEYS, buildRedirect, validateAuthorizeRequest, type AuthorizeParams } from '@/lib/oauth/authorize'

export const dynamic = 'force-dynamic'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-1 mb-8 justify-center">
          <Image src="/images/Urban Simple Logos/Urban Simple Icon.png" alt="" width={36} height={36} className="h-9 w-9" />
          <div className="flex items-baseline gap-0.5">
            <span className="font-bold text-2xl tracking-tight text-charcoal-900">Urban</span>
            <span className="font-display italic font-normal text-2xl text-bronze-500">Simple</span>
          </div>
        </div>
        <div className="rounded-2xl border border-charcoal-200 bg-white p-8 shadow-sm">{children}</div>
      </div>
    </div>
  )
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <Shell>
      <h1 className="text-xl font-display font-semibold text-charcoal-900 mb-2">{title}</h1>
      <p className="text-sm text-charcoal-600 leading-relaxed">{message}</p>
    </Shell>
  )
}

export default async function OAuthAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params: AuthorizeParams = {}
  for (const k of AUTHORIZE_PARAM_KEYS) {
    const v = sp[k]
    if (typeof v === 'string') params[k] = v
  }

  const validation = await validateAuthorizeRequest(params)
  if (validation.kind === 'fatal') {
    return <ErrorCard title="Can't continue" message={validation.message} />
  }
  if (validation.kind === 'redirect') {
    redirect(
      buildRedirect(validation.redirectUri, {
        error: validation.error,
        error_description: validation.description,
        state: validation.state,
      }),
    )
  }

  // Must be signed in — bounce through the normal admin login and come back.
  const user = await getCurrentUser()
  if (!user) {
    const qs = new URLSearchParams()
    for (const k of AUTHORIZE_PARAM_KEYS) if (params[k]) qs.set(k, params[k]!)
    redirect(`/login?next=${encodeURIComponent(`/oauth/authorize?${qs.toString()}`)}`)
  }

  // Only a real SUPER_ADMIN may grant a connector full backend access. This
  // is the same bar as holding an agent API key. Uses realRole so an
  // impersonation cookie can't lower (or raise) it.
  if (user.realRole !== 'SUPER_ADMIN' || ('via' in user && user.via)) {
    return (
      <ErrorCard
        title="Not permitted"
        message={`Only a super-admin can connect an application to the Urban Simple backend. You are signed in as ${user.email}.`}
      />
    )
  }

  const { client } = validation
  const redirectHost = new URL(validation.params.redirect_uri).host
  const appName = client.clientName?.trim() || 'An application'

  return (
    <Shell>
      <p className="text-xs uppercase tracking-wider text-charcoal-400 mb-2">Connection request</p>
      <h1 className="text-xl font-display font-semibold text-charcoal-900 mb-4">
        <span className="text-bronze-600">{appName}</span> wants to manage your Urban Simple backend
      </h1>

      <ul className="text-sm text-charcoal-700 space-y-2 mb-6">
        <li className="flex gap-2">
          <span className="text-bronze-500">•</span>
          Full read and write access to every area: clients, operations, billing, workforce, growth, BackHaus.
        </li>
        <li className="flex gap-2">
          <span className="text-bronze-500">•</span>
          Acts as <strong className="font-medium">{user.email}</strong>. Every change is audit-logged.
        </li>
        <li className="flex gap-2">
          <span className="text-bronze-500">•</span>
          Returns to <code className="text-xs bg-cream-100 px-1.5 py-0.5 rounded">{redirectHost}</code>. Access can be revoked at any time.
        </li>
      </ul>

      <form method="POST" action="/api/oauth/authorize" className="space-y-3">
        {AUTHORIZE_PARAM_KEYS.map((k) =>
          params[k] ? <input key={k} type="hidden" name={k} value={params[k]} /> : null,
        )}
        <button
          type="submit"
          name="decision"
          value="approve"
          className="w-full h-11 rounded-lg bg-charcoal-900 text-cream-50 font-medium hover:bg-charcoal-800 transition-colors"
        >
          Approve
        </button>
        <button
          type="submit"
          name="decision"
          value="deny"
          className="w-full h-11 rounded-lg border border-charcoal-200 bg-white text-charcoal-700 font-medium hover:bg-cream-100 transition-colors"
        >
          Deny
        </button>
      </form>

      <p className="text-[11px] text-charcoal-400 mt-6 leading-relaxed">
        Client ID <code className="break-all">{client.id}</code>. If you didn&apos;t start this from an app you trust, choose Deny.
      </p>
    </Shell>
  )
}
