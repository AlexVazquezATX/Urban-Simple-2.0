import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getPortalContext } from '@/lib/portal-auth'
import { deletePortalDocumentFile } from '@/lib/portal-documents'

// PATCH /api/portal/documents/[id] — update name/category/description/expiresAt.
// Only the uploader (or any portal user from the same client) can edit.
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

  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.category !== undefined) data.category = String(body.category)
  if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null
  if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

  const updated = await prisma.portalDocument.update({ where: { id }, data })
  return NextResponse.json(updated)
}

// DELETE /api/portal/documents/[id] — removes the file from storage and the row.
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

  await deletePortalDocumentFile(existing.filePath)
  await prisma.portalDocument.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
