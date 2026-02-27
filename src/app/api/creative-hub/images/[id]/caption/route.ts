import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getImageById } from '@/lib/services/creative-service'
import { GoogleGenAI } from '@google/genai'

const PLATFORM_GUIDANCE: Record<string, string> = {
  instagram: `Write a compelling Instagram caption. Use storytelling or evocative language. Include 3-5 relevant hashtags at the end. Keep under 2200 characters. Make it feel authentic, not corporate.`,
  facebook: `Write a conversational Facebook post. Include a call-to-action (visit, comment, share). No hashtag spam — 1-2 max if any. Keep it warm and engaging, like talking to a friend.`,
  twitter: `Write a punchy tweet for X/Twitter. Must be under 280 characters total. Be witty, bold, or intriguing. 1-2 hashtags max. Make every word count.`,
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { platform } = body

    if (!platform || !PLATFORM_GUIDANCE[platform]) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }

    const image = await getImageById(id)
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    const apiKey =
      process.env.GOOGLE_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      ''

    if (!apiKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    }

    const ai = new GoogleGenAI({ apiKey })

    const context = image.aiPrompt
      ? `The image was generated with this prompt: "${image.aiPrompt}"`
      : `The image is titled: "${image.name}"`

    const prompt = `You are a social media copywriter for a hospitality/lifestyle brand.

${context}

${PLATFORM_GUIDANCE[platform]}

Return ONLY a JSON object with these fields:
- "caption": the social media caption text (without hashtags)
- "hashtags": an array of hashtag strings (without the # symbol)

Example: {"caption": "The evening belongs to those who linger.", "hashtags": ["NightLife", "Cocktails", "BarCulture"]}`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { caption: text.trim(), hashtags: [] }
      )
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      caption: parsed.caption || '',
      hashtags: parsed.hashtags || [],
    })
  } catch (error) {
    console.error('[Caption API] Error:', error)
    const message = error instanceof Error ? error.message : 'Caption generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
