import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyUnsubscribeToken } from '@/lib/services/outreach-email'
import { cancelPendingMessagesForProspect } from '@/lib/services/outreach-cancel'
import { resolveOutreachActorId } from '@/lib/services/outreach-guards'

/**
 * Public opt-out link from the outreach email footer and List-Unsubscribe header.
 *
 * GET only shows a confirm button: corporate link scanners (Outlook Safe Links,
 * Mimecast) prefetch every URL in an email, and a GET that unsubscribed would
 * opt out half of every hotel chain's inboxes. POST does the work, both from
 * that button and from RFC 8058 one-click (Gmail/Outlook's native button).
 */

function page(title: string, body: string, status = 200) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f7f5f0;color:#1c1b19;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:16px}
main{max-width:420px;background:#fff;border:1px solid #e6e1d6;border-radius:12px;padding:32px;text-align:center}
h1{font-size:20px;margin:0 0 12px}p{font-size:15px;line-height:1.5;color:#5c5a55;margin:0 0 20px}
button{font:inherit;background:#1c1b19;color:#fff;border:0;border-radius:8px;padding:12px 20px;cursor:pointer}</style></head>
<body><main>${body}</main></body></html>`
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } })
}

function readParams(request: NextRequest) {
  const q = request.nextUrl.searchParams
  return { p: q.get('p') ?? '', c: q.get('c') ?? '', t: q.get('t') ?? '' }
}

const INVALID = () =>
  page('Link not valid', `<h1>This link isn't valid</h1><p>To stop hearing from us, just reply "unsubscribe" to any of our emails.</p>`, 400)

export async function GET(request: NextRequest) {
  const { p, c, t } = readParams(request)
  if (!p || !verifyUnsubscribeToken(p, c, t)) return INVALID()

  const action = `/api/outreach/unsubscribe?${new URLSearchParams({ p, c, t }).toString()}`
  return page(
    'Unsubscribe',
    `<h1>Unsubscribe from our emails?</h1><p>We won't send you any more outreach emails.</p>
<form method="post" action="${action.replace(/&/g, '&amp;')}"><button type="submit">Unsubscribe</button></form>`,
  )
}

export async function POST(request: NextRequest) {
  const { p, c, t } = readParams(request)
  if (!p || !verifyUnsubscribeToken(p, c, t)) return INVALID()

  const prospect = await prisma.prospect.findUnique({
    where: { id: p },
    select: { id: true, companyId: true, doNotContact: true },
  })
  if (!prospect) return INVALID()

  const now = new Date()

  // The same person often sits on several prospect records (duplicates, one
  // owner across restaurants). Opting out of one opts them out of all of them.
  const contact = c
    ? await prisma.prospectContact.findFirst({ where: { id: c, prospectId: p }, select: { email: true } })
    : null
  const prospectIds = new Set([prospect.id])
  if (contact?.email) {
    const others = await prisma.prospect.findMany({
      where: {
        companyId: prospect.companyId,
        contacts: { some: { email: { equals: contact.email, mode: 'insensitive' } } },
      },
      select: { id: true },
    })
    for (const o of others) prospectIds.add(o.id)
  }

  const actorId = await resolveOutreachActorId(prospect.companyId)
  for (const id of prospectIds) {
    await prisma.prospect.update({
      where: { id },
      data: { doNotContact: true, doNotContactAt: now },
    })
    await cancelPendingMessagesForProspect(id, 'unsubscribed', actorId ?? undefined)
    if (actorId) {
      await prisma.prospectActivity.create({
        data: {
          prospectId: id,
          userId: actorId,
          type: 'note',
          channel: 'system',
          title: 'Unsubscribed via email link',
          description: 'Marked Do Not Contact; pending outreach cancelled.',
        },
      })
    }
  }

  console.log(`[OUTREACH UNSUBSCRIBE] prospect ${p} opted out (${prospectIds.size} record(s) marked Do Not Contact)`)
  return page('Unsubscribed', `<h1>You're unsubscribed</h1><p>You won't receive any more outreach emails from us.</p>`)
}
