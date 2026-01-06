/**
 * Simple language detection for English/Spanish
 * Uses keyword-based detection for common Spanish words
 */

export type Language = 'en' | 'es'

// Common Spanish words and phrases
const SPANISH_KEYWORDS = [
  // Question words
  'qué',
  'quién',
  'quiénes',
  'cuándo',
  'dónde',
  'cómo',
  'cuál',
  'cuáles',
  'cuánto',
  'cuánta',
  'cuántos',
  'cuántas',
  'por qué',

  // Common verbs
  'está',
  'están',
  'tengo',
  'tienes',
  'tiene',
  'necesito',
  'necesita',
  'puedo',
  'puede',
  'hay',
  'soy',
  'eres',
  'somos',
  'hola',
  'gracias',
  'por favor',

  // Business terms
  'factura',
  'facturas',
  'pago',
  'pagos',
  'cliente',
  'clientes',
  'dinero',
  'ingresos',
  'trabajo',
  'empleado',
  'empleados',
  'horario',
  'turno',
  'turnos',
  'problema',
  'problemas',

  // Time words
  'hoy',
  'mañana',
  'semana',
  'mes',
  'año',
  'día',
  'días',

  // Common phrases
  'cuánto debo',
  'cuánto me deben',
  'quién debe',
  'cómo está',
  'dónde está',
  'qué pasó',
]

// Common English business words (for comparison)
const ENGLISH_KEYWORDS = [
  'what',
  'who',
  'when',
  'where',
  'how',
  'which',
  'invoice',
  'payment',
  'client',
  'customer',
  'money',
  'revenue',
  'schedule',
  'shift',
  'today',
  'tomorrow',
  'week',
  'month',
  'year',
]

/**
 * Detect language from text
 * Returns 'es' if Spanish is detected, 'en' otherwise
 */
export function detectLanguage(text: string): Language {
  const lowerText = text.toLowerCase()

  // Check for Spanish-specific characters
  const hasSpanishChars = /[áéíóúñü¿¡]/i.test(text)

  // Count Spanish keyword matches
  const spanishMatches = SPANISH_KEYWORDS.filter((keyword) =>
    lowerText.includes(keyword)
  ).length

  // Count English keyword matches
  const englishMatches = ENGLISH_KEYWORDS.filter((keyword) =>
    lowerText.includes(keyword)
  ).length

  // If Spanish characters present, likely Spanish
  if (hasSpanishChars) {
    return 'es'
  }

  // If more Spanish keywords than English, it's Spanish
  if (spanishMatches > englishMatches) {
    return 'es'
  }

  // Default to English
  return 'en'
}

/**
 * Add language instruction to AI prompt
 */
export function addLanguageInstruction(
  message: string,
  detectedLanguage: Language
): string {
  if (detectedLanguage === 'es') {
    return `[IMPORTANTE: El usuario está escribiendo en español. Responde en español.]\n\n${message}`
  }
  return message
}

/**
 * Get language-specific system prompt additions
 */
export function getLanguageSystemPrompt(language: Language): string {
  if (language === 'es') {
    return `\n\nIMPORTANT: The user is communicating in Spanish. You MUST respond in Spanish.
Use natural, professional Spanish appropriate for a business context.
Format numbers with periods for thousands and commas for decimals (e.g., $1.234,56).`
  }
  return ''
}
