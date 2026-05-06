import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getPortalContext } from '@/lib/portal-auth'
import { uploadPortalDocument } from '@/lib/portal-documents'

// GET /api/portal/documents — list all documents for the authenticated client.
export async function GET() {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const docs = await prisma.portalDocument.findMany({
    where: { clientId: ctx.client.id },
    orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
  })
  return NextResponse.json(docs)
}

// POST /api/portal/documents — portal user uploads a document for their client.
// Form fields: file, name, category, description?, expiresAt?
export async function POST(request: NextRequest) {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Look up the client's companyId for the storage path.
  const client = await prisma.client.findUnique({
    where: { id: ctx.client.id },
    select: { companyId: true },
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
      clientId: ctx.client.id,
    })

    const doc = await prisma.portalDocument.create({
      data: {
        clientId: ctx.client.id,
        uploadedById: ctx.userId,
        category,
        name,
        description,
        fileUrl: upload.url,
        filePath: upload.path,
        fileSize: upload.size,
        mimeType: upload.mimeType,
        expiresAt,
        uploadedFromPortal: true,
      },
    })

    return NextResponse.json(doc, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
