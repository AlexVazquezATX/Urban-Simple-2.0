import { NextRequest, NextResponse, after } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  isOwnStorageUrl,
  loadAccessibleShift,
  normalizeSections,
  parseIncompleteItems,
  shiftLocationIds,
} from '@/lib/ops/field'
import { NOT_DONE_REASONS, type IncompleteItem } from '@/lib/ops/constants'
import { onIncompleteWorkSubmitted } from '@/lib/ops/issue-events'

// The associate visit screen: one shift + one stop.
//
// GET  /api/field/visit?shiftId&locationId  → everything the screen needs
// POST /api/field/visit                     → save progress or finish the visit
//
// Finishing requires every checklist item to be accounted for: done, or "not
// done" with a reason. Not-done items become one "Unfinished work" issue that
// alerts the manager and (if they opted in) the client's on-site contacts.

async function getContext(request: NextRequest, shiftId: string | null, locationId: string | null) {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!shiftId || !locationId) {
    return { error: NextResponse.json({ error: 'shiftId and locationId are required' }, { status: 400 }) }
  }
  const shift = await loadAccessibleShift(user, shiftId)
  if (!shift) {
    return { error: NextResponse.json({ error: 'Shift not found or not assigned to you' }, { status: 404 }) }
  }
  if (!shiftLocationIds(shift).includes(locationId)) {
    return { error: NextResponse.json({ error: 'Location is not part of this shift' }, { status: 400 }) }
  }
  return { user, shift }
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const ctx = await getContext(request, sp.get('shiftId'), sp.get('locationId'))
    if ('error' in ctx) return ctx.error
    const { user, shift } = ctx
    const locationId = sp.get('locationId')!

    // The associate's own log for this stop; managers/admins viewing see the
    // shift associate's log.
    const workerId = shift.associateId ?? user.id
    const [location, log, me] = await Promise.all([
      prisma.location.findFirst({
        where: { id: locationId, branch: { companyId: user.companyId } },
        select: {
          id: true,
          name: true,
          address: true,
          accessInstructions: true,
          // Crew-facing heads-up. (serviceNotes is internal and can hold
          // revenue/margin from imports, so it never goes to the field.)
          painPoints: true,
          client: { select: { name: true } },
          checklistTemplate: {
            select: { id: true, name: true, nameEs: true, sections: true },
          },
        },
      }),
      prisma.serviceLog.findFirst({
        where: { shiftId: shift.id, locationId, associateId: workerId },
        select: {
          id: true,
          clockIn: true,
          clockOut: true,
          status: true,
          checklistData: true,
          incompleteItems: true,
          overallNotes: true,
          photos: true,
          submittedAt: true,
          issues: {
            where: { type: 'incomplete_work' },
            select: { id: true, status: true },
            take: 1,
          },
        },
      }),
      prisma.user.findUnique({ where: { id: user.id }, select: { preferredLanguage: true } }),
    ])
    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    return NextResponse.json({
      language: me?.preferredLanguage === 'es' ? 'es' : 'en',
      // Whoever does the work records it: the associate on crew shifts, the
      // manager only on manager-only shifts. Everyone else just views.
      readOnly: workerId !== user.id,
      shift: {
        id: shift.id,
        date: shift.date.toISOString(),
        startTime: shift.startTime,
        endTime: shift.endTime,
      },
      location: {
        id: location.id,
        name: location.name,
        clientName: location.client.name,
        address: location.address,
        accessInstructions: location.accessInstructions,
        painPoints: location.painPoints,
      },
      template: location.checklistTemplate
        ? {
            id: location.checklistTemplate.id,
            name: location.checklistTemplate.name,
            nameEs: location.checklistTemplate.nameEs,
            sections: normalizeSections(location.checklistTemplate.sections),
          }
        : null,
      log: log
        ? {
            id: log.id,
            clockIn: log.clockIn?.toISOString() ?? null,
            clockOut: log.clockOut?.toISOString() ?? null,
            status: log.status,
            checklistData: (log.checklistData as Record<string, boolean> | null) ?? {},
            incompleteItems: parseIncompleteItems(log.incompleteItems),
            overallNotes: log.overallNotes,
            photos: log.photos,
            submittedAt: log.submittedAt?.toISOString() ?? null,
            issueId: log.issues[0]?.id ?? null,
          }
        : null,
    })
  } catch (error) {
    console.error('[field/visit] GET failed:', error)
    return NextResponse.json({ error: 'Failed to load visit' }, { status: 500 })
  }
}

interface VisitBody {
  shiftId?: string
  locationId?: string
  action?: 'save' | 'finish'
  done?: string[] // item ids completed
  // itemId 'custom-…' + text = something not on the checklist, typed in
  notDone?: Array<{ itemId?: string; text?: string; reason?: string; note?: string; photos?: string[] }>
  notes?: string
  photos?: string[]
}

const REASON_IDS = new Set<string>(NOT_DONE_REASONS.map(r => r.id))

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as VisitBody | null
    if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    const ctx = await getContext(request, body.shiftId ?? null, body.locationId ?? null)
    if ('error' in ctx) return ctx.error
    const { user, shift } = ctx
    const locationId = body.locationId!
    const action = body.action === 'finish' ? 'finish' : 'save'

    // Only the person working the stop records it (see GET readOnly).
    if ((shift.associateId ?? shift.managerId) !== user.id) {
      return NextResponse.json({ error: 'Only the assigned associate can record this visit' }, { status: 403 })
    }

    const location = await prisma.location.findFirst({
      where: { id: locationId, branch: { companyId: user.companyId } },
      select: {
        id: true,
        clientId: true,
        checklistTemplateId: true,
        checklistTemplate: { select: { sections: true } },
      },
    })
    if (!location) return NextResponse.json({ error: 'Location not found' }, { status: 404 })

    const existing = await prisma.serviceLog.findFirst({
      where: { shiftId: shift.id, locationId, associateId: user.id },
    })
    if (!existing?.clockIn) {
      return NextResponse.json({ error: 'Clock in before recording this visit' }, { status: 409 })
    }
    if (existing.submittedAt) {
      return NextResponse.json(
        { error: 'This visit was already finished. Ask your manager if something needs to change.', alreadyFinished: true },
        { status: 409 }
      )
    }

    // Validate items against the location's checklist.
    const sections = normalizeSections(location.checklistTemplate?.sections)
    const itemIndex = new Map<string, { text: string; section: string; requiresPhoto: boolean }>()
    for (const s of sections) {
      for (const i of s.items) itemIndex.set(i.id, { text: i.text, section: s.name, requiresPhoto: !!i.requiresPhoto })
    }

    const done = new Set((body.done ?? []).filter(id => itemIndex.has(id)))
    const notDone: IncompleteItem[] = []
    let customCount = 0
    for (const raw of body.notDone ?? []) {
      // Typed-in item that isn't on the checklist (power out, lights broken…)
      if (raw.itemId?.startsWith('custom-') && customCount < 10) {
        const text = (raw.text ?? '').trim().slice(0, 200)
        if (!text) {
          if (action === 'finish') {
            return NextResponse.json({ error: 'Describe what was not done' }, { status: 400 })
          }
          continue
        }
        itemIndex.set(raw.itemId, { text, section: 'Other', requiresPhoto: false })
        customCount++
      }
      const meta = raw.itemId ? itemIndex.get(raw.itemId) : undefined
      if (!meta || done.has(raw.itemId!)) continue
      const reason = REASON_IDS.has(raw.reason ?? '') ? raw.reason! : ''
      const note = (raw.note ?? '').trim().slice(0, 1000)
      if (action === 'finish' && !reason) {
        return NextResponse.json({ error: `Pick a reason for "${meta.text}"` }, { status: 400 })
      }
      if (action === 'finish' && reason === 'other' && !note) {
        return NextResponse.json({ error: `Explain why "${meta.text}" was not done` }, { status: 400 })
      }
      notDone.push({
        itemId: raw.itemId!,
        text: meta.text,
        section: meta.section,
        reason, // may be blank on a mid-visit save; finish requires one
        note: note || undefined,
        photos: (raw.photos ?? []).filter(isOwnStorageUrl).slice(0, 4),
      })
    }

    if (action === 'finish') {
      const unaccounted = [...itemIndex.keys()].filter(
        id => !id.startsWith('custom-') && !done.has(id) && !notDone.some(n => n.itemId === id)
      )
      if (unaccounted.length > 0) {
        return NextResponse.json(
          { error: `${unaccounted.length} item(s) still need to be marked done or not done`, unaccounted },
          { status: 400 }
        )
      }
    }

    const notes = (body.notes ?? '').trim().slice(0, 4000) || null
    const photos = (body.photos ?? []).filter(isOwnStorageUrl).slice(0, 10)
    const now = new Date()
    const checklistData = Object.fromEntries([...done].map(id => [id, true]))

    // Claim the finish atomically so a retry or a second device can't create
    // a duplicate unfinished-work issue and double alerts.
    if (action === 'finish') {
      const claimed = await prisma.serviceLog.updateMany({
        where: { id: existing.id, submittedAt: null },
        data: { submittedAt: now },
      })
      if (claimed.count === 0) {
        return NextResponse.json({ error: 'This visit was already finished.', alreadyFinished: true }, { status: 409 })
      }
    }

    const log = await prisma.serviceLog.update({
      where: { id: existing.id },
      data: {
        checklistData,
        incompleteItems: notDone as unknown as object[],
        overallNotes: notes,
        photos,
        checklistTemplateId: location.checklistTemplateId,
        ...(action === 'finish'
          ? {
              status: notDone.length > 0 ? 'partial' : 'completed',
              submittedAt: now,
              // Finishing ends the visit; clocking out here (not in a second
              // request) means a flaky connection can't leave them on the clock.
              ...(existing.clockOut ? {} : { clockOut: now }),
            }
          : { status: 'in_progress' }),
      },
    })

    let issueId: string | null = null
    if (action === 'finish' && notDone.length > 0) {
      const severity = notDone.some(n => n.reason === 'safety') ? 'high' : 'medium'
      const title =
        notDone.length === 1
          ? `Not done: ${notDone[0].text}`
          : `${notDone.length} items not done`
      const description = notDone
        // Reasons only: the description is client-visible; crew notes stay on
        // the service log for managers.
        .map(n => `${n.section ? `${n.section}: ` : ''}${n.text} (${NOT_DONE_REASONS.find(r => r.id === n.reason)?.en ?? n.reason})`)
        .join('\n')
      const issue = await prisma.issue.create({
        data: {
          locationId,
          clientId: location.clientId,
          reportedById: user.id,
          serviceLogId: log.id,
          type: 'incomplete_work',
          source: 'associate',
          category: 'quality',
          severity,
          title,
          description,
          photos: notDone.flatMap(n => n.photos ?? []).slice(0, 12),
          visibleToClient: true,
          implicatedAssociateIds: [user.id],
        },
        select: { id: true },
      })
      issueId = issue.id
      const associateName = `${user.firstName} ${user.lastName}`.trim()
      after(() => onIncompleteWorkSubmitted({ issueId: issue.id, items: notDone, associateName }))
    }

    if (action === 'finish') {
      // When every stop on the shift is finished, the shift is done.
      const ids = shiftLocationIds(shift)
      const finished = await prisma.serviceLog.count({
        where: { shiftId: shift.id, associateId: user.id, locationId: { in: ids }, submittedAt: { not: null } },
      })
      if (finished >= ids.length && shift.associateId === user.id) {
        await prisma.shift.update({ where: { id: shift.id }, data: { status: 'completed' } })
      }
    }

    return NextResponse.json({
      id: log.id,
      status: log.status,
      clockIn: log.clockIn?.toISOString() ?? null,
      clockOut: log.clockOut?.toISOString() ?? null,
      submittedAt: log.submittedAt?.toISOString() ?? null,
      issueId,
    })
  } catch (error) {
    console.error('[field/visit] POST failed:', error)
    return NextResponse.json({ error: 'Failed to save visit' }, { status: 500 })
  }
}
