import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import {
  generateSequenceStepContent,
  type SequenceStepOptions,
} from '@/lib/ai/outreach-composer'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      channel,
      stepNumber,
      totalSteps,
      sequenceName,
      sequenceDescription,
      tone = 'friendly',
      previousStepsContext = [],
    } = body

    if (!channel || !stepNumber || !totalSteps || !sequenceName) {
      return NextResponse.json(
        { error: 'Missing required fields: channel, stepNumber, totalSteps, sequenceName' },
        { status: 400 }
      )
    }

    const options: SequenceStepOptions = {
      channel,
      stepNumber,
      totalSteps,
      sequenceName,
      sequenceDescription,
      tone,
      previousStepsContext,
    }

    const generated = await generateSequenceStepContent(options)

    return NextResponse.json({
      success: true,
      content: {
        subject: generated.subject,
        body: generated.body,
      },
    })
  } catch (error: any) {
    console.error('Error generating sequence step content:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate sequence step content' },
      { status: 500 }
    )
  }
}
