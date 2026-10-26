import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getPortalContext } from '@/lib/portal-auth'
import { PORTAL_DOC_CATEGORIES, deletePortalDocumentFile } from '@/lib/portal-documents'

// PATCH /api/portal/documents/[id]: update name/category/description/expiresAt.
// Only documents uploaded from the portal can be edited or deleted here;
// contracts, COIs and other docs Urban Simple uploaded are read-only.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.portalDocument.findFirst({
    where: { id, clientId: ctx.client.id },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!existing.uploadedFromPortal) {
    return NextResponse.json(
      { error: 'This document was added by Urban Simple and can only be changed by our team.' },
      { status: 403 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const name = String(body.name).trim().slice(0, 200)
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    data.name = name
  }
  if (body.category !== undefined) {
    const category = String(body.category)
    if (!PORTAL_DOC_CATEGORIES.some(c => c.value === category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    data.category = category
  }
  if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null
  if (body.expiresAt !== undefined) {
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json({ error: 'Invalid expiration date' }, { status: 400 })
    }
    data.expiresAt = expiresAt
  }

  const updated = await prisma.portalDocument.update({ where: { id }, data })
  return NextResponse.json(updated)
}

// DELETE /api/portal/documents/[id]: removes the file from storage and the row.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.portalDocument.findFirst({
    where: { id, clientId: ctx.client.id },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!existing.uploadedFromPortal) {
    return NextResponse.json(
      { error: 'This document was added by Urban Simple and can only be removed by our team.' },
      { status: 403 }
    )
  }

  await deletePortalDocumentFile(existing.filePath)
  await prisma.portalDocument.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
