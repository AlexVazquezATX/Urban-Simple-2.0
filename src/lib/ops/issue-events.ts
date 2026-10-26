// Business events for the ops loop. Route handlers call these inside
// `after()`; each one figures out who needs to hear about what and fans out
// through lib/notify. All functions are best-effort and never throw.
//
// Client-facing copy avoids em dashes and internal jargon on purpose.

import { format } from 'date-fns'
import { prisma } from '@/lib/db'
import {
  appBaseUrl,
  clientRecipientsForLocation,
  notifyClients,
  notifyStaff,
  staffRecipientsForLocation,
} from '@/lib/notify'
import { toEnglish } from '@/lib/notify/translate'
import {
  categoryLabel,
  issueTypeLabel,
  reasonLabel,
  statusLabel,
  type IncompleteItem,
} from './constants'

const ISSUE_INCLUDE = {
  location: { select: { id: true, name: true, branch: { select: { companyId: true } } } },
  client: { select: { id: true, name: true } },
  reportedBy: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
  serviceLog: { select: { serviceDate: true } },
} as const

async function loadIssue(issueId: string) {
  return prisma.issue.findUnique({ where: { id: issueId }, include: ISSUE_INCLUDE })
}

type LoadedIssue = NonNullable<Awaited<ReturnType<typeof loadIssue>>>

const staffLink = (id: string) => `/operations/issues/${id}`
const portalUrl = (id: string) => `${appBaseUrl()}/portal/issues/${id}`

function name(u: { firstName: string; lastName: string } | null | undefined) {
  return u ? `${u.firstName} ${u.lastName}`.trim() : ''
}

/** Lines like "Kitchen: Mop floor (Ran out of time. Note...)" */
function itemLines(items: IncompleteItem[], notes?: Map<string, string>): string[] {
  return items.map(i => {
    const note = notes?.get(i.itemId) ?? i.note
    const detail = [reasonLabel(i.reason, 'en'), note].filter(Boolean).join('. ')
    return `${i.section ? `${i.section}: ` : ''}${i.text}${detail ? ` (${detail})` : ''}`
  })
}

/** Portal users who reported it get updates on their own issue. */
function reporterEmailIfClient(issue: LoadedIssue): string[] {
  return issue.reportedBy.role === 'CLIENT_USER' && issue.reportedBy.email ? [issue.reportedBy.email] : []
}

// ---------------------------------------------------------------------------
// Associate finished a visit with items not done.
// ---------------------------------------------------------------------------
export async function onIncompleteWorkSubmitted(params: {
  issueId: string
  items: IncompleteItem[]
  associateName: string
}) {
  try {
    const issue = await loadIssue(params.issueId)
    if (!issue) return
    const companyId = issue.location.branch.companyId
    const serviceDate = issue.serviceLog?.serviceDate ?? issue.createdAt
    const items = params.items
    const photoCount = items.reduce((n, i) => n + (i.photos?.length ?? 0), 0)

    // Staff: always, right away.
    const staff = await staffRecipientsForLocation({
      companyId,
      locationId: issue.locationId,
      serviceDate,
      escalate: issue.severity === 'high' || issue.severity === 'critical',
    })
    const lines = itemLines(items)
    await notifyStaff(staff, {
      companyId,
      type: 'action_required',
      title: `Unfinished work at ${issue.location.name}`,
      message: `${params.associateName} flagged ${items.length} item${items.length === 1 ? '' : 's'} not done.`,
      link: staffLink(issue.id),
      subject: `Unfinished work: ${issue.location.name} (${items.length} item${items.length === 1 ? '' : 's'})`,
      email: {
        kicker: 'Unfinished work',
        title: `${items.length} item${items.length === 1 ? '' : 's'} not finished at ${issue.location.name}`,
        rows: [
          ['Client', issue.client.name],
          ['Location', issue.location.name],
          ['Associate', params.associateName],
          ['Service date', format(serviceDate, 'EEE MMM d')],
          ['Photos', photoCount ? String(photoCount) : ''],
        ],
        bullets: lines,
        ctaLabel: 'Open in Urban Simple',
        ctaUrl: `${appBaseUrl()}${staffLink(issue.id)}`,
      },
      sms: `Urban Simple: ${items.length} item(s) not finished at ${issue.location.name} (${params.associateName}). ${appBaseUrl()}${staffLink(issue.id)}`,
    })

    // Client: opted-in contacts for this location hear about it before they
    // walk in, so their own team can cover it. Associate notes are translated.
    if (!issue.visibleToClient) return
    const clients = await clientRecipientsForLocation({ clientId: issue.clientId, locationId: issue.locationId })
    if (clients.length === 0) return

    const translated = new Map<string, string>()
    await Promise.all(
      items.filter(i => i.note).map(async i => translated.set(i.itemId, await toEnglish(i.note)))
    )
    const clientLines = itemLines(items, translated)
    const result = await notifyClients(clients, {
      companyId,
      clientId: issue.clientId,
      subject: `Heads up: ${items.length} item${items.length === 1 ? '' : 's'} not finished at ${issue.location.name}`,
      email: {
        kicker: 'Service update',
        title: `A few items were not finished at ${issue.location.name}`,
        intro:
          'Our crew was not able to complete everything on tonight\'s list. We wanted you to know before you arrive so your team can plan around it. Your Urban Simple manager has been notified and will follow up.',
        rows: [
          ['Location', issue.location.name],
          ['Service date', format(serviceDate, 'EEEE, MMMM d')],
        ],
        bullets: clientLines,
        ctaLabel: 'View details',
        ctaUrl: portalUrl(issue.id),
        footer: 'You are receiving this because you asked to be alerted about unfinished work. Reply to this email to reach our team.',
      },
      sms: `Urban Simple: ${items.length} item(s) not finished tonight at ${issue.location.name}: ${clientLines
        .slice(0, 2)
        .join('; ')}${items.length > 2 ? '; ...' : ''}. Details: ${portalUrl(issue.id)} Reply STOP to opt out.`,
    })
    if (result.emailed || result.texted) {
      await prisma.issue.update({ where: { id: issue.id }, data: { clientNotifiedAt: new Date() } })
    }
  } catch (err) {
    console.error('[ops/events] onIncompleteWorkSubmitted failed:', err)
  }
}

// ---------------------------------------------------------------------------
// New issue / request (client portal, associate "flag a problem", staff).
// ---------------------------------------------------------------------------
export async function onIssueCreated(issueId: string) {
  try {
    const issue = await loadIssue(issueId)
    if (!issue) return
    const companyId = issue.location.branch.companyId
    const reporter = name(issue.reportedBy)
    const typeLabel = issueTypeLabel(issue.type)
    const fromClient = issue.source === 'client'
    const escalate = issue.severity === 'high' || issue.severity === 'critical'

    // Manager review pain points are created by the manager themselves; only
    // escalate serious ones to admins.
    if (issue.source === 'manager_review' && !escalate) return

    const staff = await staffRecipientsForLocation({
      companyId,
      locationId: issue.locationId,
      serviceDate: issue.serviceLog?.serviceDate ?? issue.createdAt,
      escalate: escalate || fromClient,
      excludeUserIds: [issue.reportedById],
    })
    const headline = fromClient
      ? `${issue.client.name} ${issue.type === 'request' ? 'requested' : 'reported'}: ${issue.title}`
      : `${typeLabel}: ${issue.title}`
    await notifyStaff(staff, {
      companyId,
      type: escalate ? 'warning' : 'action_required',
      title: headline,
      message: `${issue.location.name} · ${reporter}`,
      link: staffLink(issue.id),
      subject: `${fromClient ? 'Client ' : ''}${typeLabel.toLowerCase()}: ${issue.title} (${issue.location.name})`,
      email: {
        kicker: fromClient ? `Client ${typeLabel.toLowerCase()}` : typeLabel,
        title: issue.title,
        rows: [
          ['Client', issue.client.name],
          ['Location', issue.location.name],
          ['Reported by', reporter],
          [issue.type === 'request' ? 'Request type' : 'Category', categoryLabel(issue.category, issue.type)],
          ['Severity', issue.type === 'request' ? '' : issue.severity],
          ['Preferred date', issue.preferredDate ? format(issue.preferredDate, 'EEE MMM d') : ''],
          ['Photos', issue.photos.length ? String(issue.photos.length) : ''],
        ],
        body: issue.description ?? undefined,
        ctaLabel: 'Open in Urban Simple',
        ctaUrl: `${appBaseUrl()}${staffLink(issue.id)}`,
      },
      sms: escalate || fromClient
        ? `Urban Simple: ${headline.slice(0, 120)} at ${issue.location.name}. ${appBaseUrl()}${staffLink(issue.id)}`
        : undefined,
    })

    // Confirmation back to the client who reported it: closes the loop.
    if (fromClient && issue.reportedBy.email) {
      await notifyClients([], {
        companyId,
        clientId: issue.clientId,
        subject: `We got your ${issue.type === 'request' ? 'request' : 'report'}: ${issue.title}`,
        extraEmails: [issue.reportedBy.email],
        email: {
          kicker: issue.type === 'request' ? 'Request received' : 'Report received',
          title: `Thanks, ${issue.reportedBy.firstName}. We're on it.`,
          intro:
            issue.type === 'request'
              ? 'Your request is with your Urban Simple manager. You will get an email as soon as it is scheduled or if we have a question.'
              : 'Your report is with your Urban Simple manager. You will get an email when there is an update or it is resolved.',
          rows: [
            ['Location', issue.location.name],
            ['Subject', issue.title],
          ],
          ctaLabel: 'Track it in the portal',
          ctaUrl: portalUrl(issue.id),
        },
      })
    }
  } catch (err) {
    console.error('[ops/events] onIssueCreated failed:', err)
  }
}

// ---------------------------------------------------------------------------
// Manager chose to share an issue with the client (and alert them now).
// ---------------------------------------------------------------------------
export async function sendIssueToClient(params: { issueId: string; message?: string | null }) {
  const issue = await loadIssue(params.issueId)
  if (!issue) return { emailed: 0, texted: 0 }
  const companyId = issue.location.branch.companyId
  const clients = await clientRecipientsForLocation({ clientId: issue.clientId, locationId: issue.locationId })
  const result = await notifyClients(clients, {
    companyId,
    clientId: issue.clientId,
    extraEmails: reporterEmailIfClient(issue),
    subject: `Update from Urban Simple: ${issue.title} (${issue.location.name})`,
    email: {
      kicker: issueTypeLabel(issue.type),
      title: issue.title,
      intro: params.message?.trim() || undefined,
      rows: [
        ['Location', issue.location.name],
        ['Status', statusLabel(issue.status)],
      ],
      body: params.message?.trim() ? undefined : issue.description ?? undefined,
      ctaLabel: 'View in the portal',
      ctaUrl: portalUrl(issue.id),
    },
    sms: `Urban Simple update for ${issue.location.name}: ${(params.message?.trim() || issue.title).slice(0, 160)} ${portalUrl(issue.id)} Reply STOP to opt out.`,
  })
  await prisma.issue.update({
    where: { id: issue.id },
    data: { visibleToClient: true, clientNotifiedAt: new Date() },
  })
  return result
}

// ---------------------------------------------------------------------------
// Comment on an issue.
// ---------------------------------------------------------------------------
export async function onIssueComment(params: { issueId: string; commentId: string }) {
  try {
    const [issue, comment] = await Promise.all([
      loadIssue(params.issueId),
      prisma.issueComment.findUnique({
        where: { id: params.commentId },
        include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
      }),
    ])
    if (!issue || !comment) return
    const companyId = issue.location.branch.companyId
    const author = name(comment.user)

    if (comment.user.role === 'CLIENT_USER') {
      const staff = await staffRecipientsForLocation({
        companyId,
        locationId: issue.locationId,
        excludeUserIds: [comment.userId],
      })
      // Also loop in whoever is assigned.
      if (issue.assignedToId && !staff.some(s => s.id === issue.assignedToId)) {
        const assignee = await prisma.user.findFirst({
          where: { id: issue.assignedToId, isActive: true },
          select: { id: true, email: true, firstName: true, phone: true, smsAlerts: true },
        })
        if (assignee) staff.push(assignee)
      }
      await notifyStaff(staff, {
        companyId,
        type: 'action_required',
        title: `${author} replied: ${issue.title}`,
        message: comment.comment.slice(0, 200),
        link: staffLink(issue.id),
        subject: `Client reply: ${issue.title} (${issue.location.name})`,
        email: {
          kicker: 'Client reply',
          title: issue.title,
          rows: [
            ['Client', issue.client.name],
            ['Location', issue.location.name],
            ['From', author],
          ],
          body: comment.comment,
          ctaLabel: 'Reply in Urban Simple',
          ctaUrl: `${appBaseUrl()}${staffLink(issue.id)}`,
        },
      })
      return
    }

    // Staff comment: only public comments on client-visible issues go out.
    if (comment.isInternal || !issue.visibleToClient) return
    const clients = await clientRecipientsForLocation({ clientId: issue.clientId, locationId: issue.locationId })
    await notifyClients(
      clients.map(c => ({ ...c, phone: null })), // replies go by email only
      {
        companyId,
        clientId: issue.clientId,
        extraEmails: reporterEmailIfClient(issue),
        subject: `Re: ${issue.title} (${issue.location.name})`,
        email: {
          kicker: 'New reply',
          title: issue.title,
          intro: `${author} from Urban Simple replied:`,
          body: comment.comment,
          ctaLabel: 'Reply in the portal',
          ctaUrl: portalUrl(issue.id),
        },
      }
    )
  } catch (err) {
    console.error('[ops/events] onIssueComment failed:', err)
  }
}

// ---------------------------------------------------------------------------
// Status change (in progress / resolved / closed).
// ---------------------------------------------------------------------------
export async function onIssueStatusChanged(params: {
  issueId: string
  previousStatus: string
  actorId: string
}) {
  try {
    const issue = await loadIssue(params.issueId)
    if (!issue || issue.status === params.previousStatus) return
    if (!issue.visibleToClient) return
    if (!['in_progress', 'resolved', 'closed'].includes(issue.status)) return
    // Closing an already-resolved issue is bookkeeping; don't email again.
    if (issue.status === 'closed' && params.previousStatus === 'resolved') return

    const companyId = issue.location.branch.companyId
    const clients = await clientRecipientsForLocation({ clientId: issue.clientId, locationId: issue.locationId })
    const done = issue.status === 'resolved' || issue.status === 'closed'
    const noun = issue.type === 'request' ? 'request' : issue.type === 'incomplete_work' ? 'unfinished items' : 'report'
    await notifyClients(
      clients.map(c => ({ ...c, phone: null })),
      {
        companyId,
        clientId: issue.clientId,
        extraEmails: reporterEmailIfClient(issue),
        subject: done
          ? `Resolved: ${issue.title} (${issue.location.name})`
          : `In progress: ${issue.title} (${issue.location.name})`,
        email: {
          kicker: done ? 'Resolved' : 'In progress',
          title: issue.title,
          intro: done
            ? `Your ${noun} at ${issue.location.name} has been taken care of.`
            : `We're working on your ${noun} at ${issue.location.name}.`,
          rows: [['Status', statusLabel(issue.status)]],
          body: done && issue.resolution ? `What we did: ${issue.resolution}` : undefined,
          ctaLabel: done ? 'View or reopen in the portal' : 'View in the portal',
          ctaUrl: portalUrl(issue.id),
        },
      }
    )
  } catch (err) {
    console.error('[ops/events] onIssueStatusChanged failed:', err)
  }
}

// ---------------------------------------------------------------------------
// Client rated a visit. Low ratings page the manager.
// ---------------------------------------------------------------------------
export async function onVisitRated(ratingId: string) {
  try {
    const r = await prisma.clientVisitRating.findUnique({
      where: { id: ratingId },
      include: {
        location: { select: { id: true, name: true, branch: { select: { companyId: true } } } },
        client: { select: { name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    })
    if (!r || r.rating > 3) return
    const companyId = r.location.branch.companyId
    const staff = await staffRecipientsForLocation({
      companyId,
      locationId: r.locationId,
      serviceDate: r.serviceDate,
      escalate: r.rating <= 2,
    })
    await notifyStaff(staff, {
      companyId,
      type: 'warning',
      title: `${r.rating}/5 rating from ${r.client.name}`,
      message: `${r.location.name}${r.comment ? `: ${r.comment.slice(0, 160)}` : ''}`,
      link: `/locations/${r.locationId}`,
      subject: `Low rating: ${r.rating}/5 at ${r.location.name}`,
      email: {
        kicker: 'Client rating',
        title: `${r.client.name} rated a visit ${r.rating} out of 5`,
        rows: [
          ['Location', r.location.name],
          ['Visit', format(r.serviceDate, 'EEE MMM d')],
          ['From', name(r.createdBy)],
        ],
        body: r.comment ?? undefined,
        ctaLabel: 'Open location',
        ctaUrl: `${appBaseUrl()}/locations/${r.locationId}`,
      },
    })
  } catch (err) {
    console.error('[ops/events] onVisitRated failed:', err)
  }
}
