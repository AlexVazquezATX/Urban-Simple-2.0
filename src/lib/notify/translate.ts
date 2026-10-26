// Best-effort translation of associate free text (often Spanish) into English
// before it goes to a client. Falls back to the original text on any problem,
// and never waits more than a few seconds.

import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY

export async function toEnglish(text: string | null | undefined): Promise<string> {
  const input = (text ?? '').trim()
  if (!input || !API_KEY) return input
  // Plain-ASCII text with common English words is almost certainly English already.
  if (/^[\x20-\x7E\s]*$/.test(input) && /\b(the|and|was|is|not|no|out|of|to)\b/i.test(input)) {
    return input
  }
  try {
    const model = new GoogleGenerativeAI(API_KEY).getGenerativeModel({ model: 'gemini-2.5-flash' })
    const prompt =
      'You translate short notes written by commercial cleaning staff for a client. ' +
      'If the note is not in English, translate it to clear, polite English. If it is already English, ' +
      'return it unchanged. Return only the note text, no quotes or commentary.\n\nNote:\n' +
      input
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 6000)),
    ])
    const out = result?.response?.text()?.trim()
    return out && out.length < input.length * 4 + 200 ? out : input
  } catch (err) {
    console.error('[notify/translate] failed, using original:', err)
    return input
  }
}
