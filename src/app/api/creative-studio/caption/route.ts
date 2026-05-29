/**
 * Creative Studio — Caption Writer API
 *
 * POST: given the context of a just-generated image (food photo or branded
 * post), returns a ready-to-post Instagram caption + hashtags for restaurant
 * clients. Text-only generation (fast/cheap); image-aware captions are a
 * possible future enhancement.
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { GoogleGenAI } from '@google/genai'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const {
      mode,
      dishDescription,
      cuisineType,
      outputFormat,
      headline,
      postType,
      restaurantName,
    } = body ?? {}

    const apiKey =
      process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''
    if (!apiKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 })
    }

    const ai = new GoogleGenAI({ apiKey })

    const subject =
      mode === 'branded_post'
        ? headline
          ? `a branded social post whose on-image text is "${headline}"${postType ? ` (a ${postType} post)` : ''}`
          : `a branded social graphic${postType ? ` (a ${postType} post)` : ''}`
        : dishDescription
          ? `a photo of this dish: ${dishDescription}`
          : 'a professional food photo'

    const details = [
      cuisineType ? `Cuisine: ${cuisineType}.` : '',
      restaurantName ? `The restaurant is "${restaurantName}".` : '',
      outputFormat ? `The image is formatted for: ${outputFormat}.` : '',
    ]
      .filter(Boolean)
      .join(' ')

    const prompt = `You are a social media copywriter for a restaurant. Write one Instagram caption for ${subject}. ${details}

Rules:
- Warm, appetizing, and authentic. Sound like a real restaurant, not a corporation.
- One or two short sentences. Make people hungry.
- Do NOT use em dashes anywhere.
- Do NOT use bracketed placeholders like [name] or [city]. The caption must be ready to post exactly as written.
- At most one tasteful emoji (optional).
- Then provide 5 to 7 relevant, specific hashtags (no # symbol, no spaces).

Return ONLY a JSON object in this exact shape:
{"caption": "the caption text", "hashtags": ["hashtag1", "hashtag2"]}`

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      return NextResponse.json({ caption: text.trim(), hashtags: [] })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({
      caption: typeof parsed.caption === 'string' ? parsed.caption.trim() : '',
      hashtags: Array.isArray(parsed.hashtags)
        ? parsed.hashtags
            .filter((h: unknown): h is string => typeof h === 'string')
            .map((h: string) => h.replace(/^#/, '').trim())
            .filter(Boolean)
        : [],
    })
  } catch (error) {
    console.error('[Studio Caption API] Error:', error)
    const message =
      error instanceof Error ? error.message : 'Caption generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
