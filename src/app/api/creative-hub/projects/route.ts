import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  createProject,
  getProjectsByCompany,
} from '@/lib/services/creative-service'

// GET - List projects for company
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const projects = await getProjectsByCompany(
      user.companyId,
      status || undefined
    )

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST - Create new project
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const project = await createProject({
      companyId: user.companyId,
      createdById: user.id,
      name: body.name,
      description: body.description,
      campaignGoal: body.campaignGoal,
      targetAudience: body.targetAudience,
      brandVoice: body.brandVoice,
      defaultTone: body.defaultTone || 'professional',
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
