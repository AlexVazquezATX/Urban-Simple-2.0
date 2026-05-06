import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { uploadPortalDocument } from '@/lib/portal-documents'

// GET /api/clients/[id]/documents — admin list of all portal documents
// for a given client. Used by the admin Documents tab on /clients/[id].
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { id: clientId } = await params

  // Verify the client belongs to this user's company.
  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId: user.companyId, deletedAt: null },
    select: { id: true },
  })
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const docs = await prisma.portalDocument.findMany({
    where: { clientId },
    orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    include: {
      uploadedBy: { select: { firstName: true, lastName: true } },
    },
  })

  return NextResponse.json(docs)
}

// POST /api/clients/[id]/documents — admin uploads a doc on behalf of the client.
// Form fields: file, name?, category?, description?, expiresAt?
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user.role)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { id: clientId } = await params
  const client = await prisma.client.findFirst({
    where: { id: clientId, companyId: user.companyId, deletedAt: null },
    select: { id: true, companyId: true },
  })
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const name = (formData.get('name') as string | null)?.trim() || file?.name || 'Untitled'
  const category = (formData.get('category') as string | null) || 'other'
  const description = (formData.get('description') as string | null)?.trim() || null
  const expiresAtRaw = formData.get('expiresAt') as string | null

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  let expiresAt: Date | null = null
  if (expiresAtRaw) {
    const d = new Date(expiresAtRaw)
    if (!Number.isNaN(d.getTime())) expiresAt = d
  }

  try {
    const upload = await uploadPortalDocument({
      file,
      companyId: client.companyId,
      clientId,
    })
    const doc = await prisma.portalDocument.create({
      data: {
        clientId,
        uploadedById: user.id,
        category,
        name,
        description,
        fileUrl: upload.url,
        filePath: upload.path,
        fileSize: upload.size,
        mimeType: upload.mimeType,
        expiresAt,
        uploadedFromPortal: false,
      },
    })
    return NextResponse.json(doc, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
