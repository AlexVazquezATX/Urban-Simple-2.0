import OpenAI from 'openai'

// Initialize OpenAI client lazily to avoid build-time errors
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables')
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

/**
 * Translate cleaning checklist items from English to Spanish
 * Uses GPT-4 with a specialized prompt for cleaning industry terminology
 */
export async function translateToSpanish(
  texts: string[],
  context: 'cleaning_checklist' | 'section_name' = 'cleaning_checklist'
): Promise<string[]> {
  if (texts.length === 0) {
    return []
  }

  const prompt =
    context === 'cleaning_checklist'
      ? `You are translating cleaning checklist items from English to Spanish. These are used by cleaning crews in commercial kitchens and restaurants. Use professional but accessible Spanish appropriate for cleaning staff. Translate each item accurately, maintaining the same level of detail and technical terminology when appropriate.

Translate the following items, returning only the translations in the same order, one per line:

${texts.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
      : `You are translating section names for cleaning checklists from English to Spanish. These are used in commercial cleaning operations. Use professional Spanish appropriate for cleaning staff.

Translate the following section names, returning only the translations in the same order, one per line:

${texts.map((t, i) => `${i + 1}. ${t}`).join('\n')}`

  try {
    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional translator specializing in commercial cleaning terminology. Translate accurately and maintain consistency.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more consistent translations
      max_tokens: 2000,
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    // Parse the response - split by newlines and clean up
    const translations = response
      .split('\n')
      .map((line) => {
        // Remove leading numbers and dots (e.g., "1. " or "1.")
        return line.replace(/^\d+\.\s*/, '').trim()
      })
      .filter((line) => line.length > 0)

    if (translations.length !== texts.length) {
      console.warn(
        `Translation count mismatch: expected ${texts.length}, got ${translations.length}`
      )
      // If we got fewer translations, pad with empty strings
      while (translations.length < texts.length) {
        translations.push('')
      }
    }

    return translations.slice(0, texts.length)
  } catch (error) {
    console.error('OpenAI translation error:', error)
    throw new Error('Failed to translate text')
  }
}

/**
 * Batch translate multiple texts efficiently
 * Splits large batches into smaller chunks to avoid token limits
 */
export async function batchTranslate(
  texts: string[],
  context: 'cleaning_checklist' | 'section_name' = 'cleaning_checklist',
  batchSize: number = 20
): Promise<string[]> {
  if (texts.length === 0) {
    return []
  }

  const results: string[] = []

  // Process in batches
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const translations = await translateToSpanish(batch, context)
    results.push(...translations)
  }

  return results
}


