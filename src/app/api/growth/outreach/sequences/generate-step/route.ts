import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  generateSequenceStepContent,
  type SequenceStepOptions,
} from '@/lib/ai/outreach-composer'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
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
  } catch (error) {
    console.error('Error generating sequence step content:', error)
    return NextResponse.json(
      { error: 'Failed to generate sequence step content' },
      { status: 500 }
    )
  }
}
