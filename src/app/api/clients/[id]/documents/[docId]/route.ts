import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { deletePortalDocumentFile } from '@/lib/portal-documents'

// PATCH /api/clients/[id]/documents/[docId] — admin updates document metadata.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { id: clientId, docId } = await params
  const existing = await prisma.portalDocument.findFirst({
    where: {
      id: docId,
      clientId,
      client: { companyId: user.companyId },
    },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = String(body.name).trim()
  if (body.category !== undefined) data.category = String(body.category)
  if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null
  if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

  const updated = await prisma.portalDocument.update({ where: { id: docId }, data })
  return NextResponse.json(updated)
}

// DELETE /api/clients/[id]/documents/[docId] — admin removes a document.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { id: clientId, docId } = await params
  const existing = await prisma.portalDocument.findFirst({
    where: {
      id: docId,
      clientId,
      client: { companyId: user.companyId },
    },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await deletePortalDocumentFile(existing.filePath)
  await prisma.portalDocument.delete({ where: { id: docId } })
  return NextResponse.json({ success: true })
}
