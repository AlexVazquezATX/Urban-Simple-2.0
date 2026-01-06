import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { batchTranslate } from '@/lib/openai'

// POST /api/translate - Translate text to Spanish using OpenAI
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { texts, context } = body

    if (!texts || !Array.isArray(texts)) {
      return NextResponse.json(
        { error: 'texts must be an array of strings' },
        { status: 400 }
      )
    }

    if (texts.length === 0) {
      return NextResponse.json({ translations: [] })
    }

    // Validate all items are strings
    if (!texts.every((t: any) => typeof t === 'string')) {
      return NextResponse.json(
        { error: 'All items in texts array must be strings' },
        { status: 400 }
      )
    }

    // Translate using OpenAI
    const translations = await batchTranslate(
      texts,
      context || 'cleaning_checklist',
      20 // Batch size
    )

    return NextResponse.json({ translations })
  } catch (error: any) {
    console.error('Translation error:', error)
    
    if (error.message?.includes('OPENAI_API_KEY')) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to translate text' },
      { status: 500 }
    )
  }
}


