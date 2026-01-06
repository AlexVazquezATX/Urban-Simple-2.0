/**
 * AI Query Classification and Routing
 * Analyzes user queries to determine intent and fetch relevant data
 */

export type QueryIntent =
  | 'finance'
  | 'schedule'
  | 'team'
  | 'issues'
  | 'clients'
  | 'locations'
  | 'performance'
  | 'general'

export interface QueryClassification {
  intent: QueryIntent
  confidence: number
  keywords: string[]
  timeframe?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  entities?: {
    clientNames?: string[]
    locationNames?: string[]
    associateNames?: string[]
    dateRange?: { start: Date; end: Date }
  }
}

/**
 * Classify a user query to determine intent
 */
export function classifyQuery(query: string): QueryClassification {
  const lowerQuery = query.toLowerCase()

  // Common casual greetings/phrases that should ALWAYS be general
  const casualPhrases = [
    "what's up",
    "whats up",
    "how are you",
    "how's it going",
    "hows it going",
    "good morning",
    "good afternoon",
    "good evening",
    "hey there",
    "how are things",
    "checking in",
    "just saying hi",
    "hello",
    "hi cassie",
    "hey cassie",
  ]

  // Entertainment/casual topics that should ALWAYS be general
  const casualTopics = [
    "stranger things",
    "tv show",
    "episode",
    "season",
    "movie",
    "netflix",
    "watched",
    "watching",
    "binge",
    "binged",
    "binging",
    "fan of",
    "restaurant",
    "dinner",
    "lunch",
    "food",
    "weekend",
    "vacation",
    "holiday",
  ]

  // Check if query is a casual greeting or casual topic first
  if (casualPhrases.some(phrase => lowerQuery.includes(phrase))) {
    return {
      intent: 'general',
      confidence: 0.95,
      keywords: [],
      timeframe: undefined,
    }
  }

  if (casualTopics.some(topic => lowerQuery.includes(topic))) {
    return {
      intent: 'general',
      confidence: 0.9,
      keywords: [],
      timeframe: undefined,
    }
  }

  // Finance keywords
  const financeKeywords = [
    'revenue',
    'money',
    'invoice',
    'payment',
    'paid',
    'owe',
    'ar',
    'receivable',
    'bill',
    'financial',
    'cash',
    'profit',
    'income',
    'expense',
  ]

  // Schedule keywords
  const scheduleKeywords = [
    'schedule',
    'shift',
    'when',
    'time',
    'today',
    'tomorrow',
    'week',
    'calendar',
    'working',
    'assigned',
    'route',
  ]

  // Team keywords
  const teamKeywords = [
    'team',
    'associate',
    'employee',
    'worker',
    'staff',
    'crew',
    'who',
    'people',
    'performance',
    'rating',
  ]

  // Issues keywords
  const issueKeywords = [
    'issue',
    'problem',
    'concern',
    'complaint',
    'quality',
    'fix',
    'wrong',
    'error',
    'trouble',
  ]

  // Client keywords
  const clientKeywords = [
    'client',
    'customer',
    'account',
    'top client',
    'best client',
    'biggest',
  ]

  // Location keywords
  const locationKeywords = [
    'location',
    'site',
    'property',
    'where',
    'place',
    'hotel',
    'restaurant',
  ]

  // Performance keywords
  const performanceKeywords = [
    'perform',
    'rating',
    'score',
    'quality',
    'review',
    'feedback',
    'complete',
    'finish',
  ]

  // Count keyword matches
  const matches = {
    finance: countKeywordMatches(lowerQuery, financeKeywords),
    schedule: countKeywordMatches(lowerQuery, scheduleKeywords),
    team: countKeywordMatches(lowerQuery, teamKeywords),
    issues: countKeywordMatches(lowerQuery, issueKeywords),
    clients: countKeywordMatches(lowerQuery, clientKeywords),
    locations: countKeywordMatches(lowerQuery, locationKeywords),
    performance: countKeywordMatches(lowerQuery, performanceKeywords),
  }

  // Find the category with the most matches
  const maxMatches = Math.max(...Object.values(matches))
  const intent =
    maxMatches > 0
      ? (Object.keys(matches).find(
          (key) => matches[key as keyof typeof matches] === maxMatches
        ) as QueryIntent)
      : 'general'

  // Calculate confidence (0-1)
  const totalWords = lowerQuery.split(/\s+/).length
  const confidence = maxMatches > 0 ? Math.min(maxMatches / totalWords, 1) : 0.3

  // Extract timeframe
  const timeframe = extractTimeframe(lowerQuery)

  // Find matching keywords
  const allKeywords = {
    finance: financeKeywords,
    schedule: scheduleKeywords,
    team: teamKeywords,
    issues: issueKeywords,
    clients: clientKeywords,
    locations: locationKeywords,
    performance: performanceKeywords,
  }

  const matchedKeywords = (allKeywords[intent as keyof typeof allKeywords] || []).filter((keyword) =>
    lowerQuery.includes(keyword)
  )

  return {
    intent,
    confidence,
    keywords: matchedKeywords,
    timeframe,
  }
}

/**
 * Count how many keywords from a list appear in the query
 */
function countKeywordMatches(query: string, keywords: string[]): number {
  return keywords.filter((keyword) => query.includes(keyword)).length
}

/**
 * Extract timeframe from query
 */
function extractTimeframe(
  query: string
): 'today' | 'week' | 'month' | 'quarter' | 'year' | undefined {
  if (query.includes('today')) return 'today'
  if (query.includes('this week') || query.includes('week')) return 'week'
  if (
    query.includes('this month') ||
    query.includes('month') ||
    query.includes('monthly')
  )
    return 'month'
  if (query.includes('quarter') || query.includes('q1') || query.includes('q2'))
    return 'quarter'
  if (query.includes('this year') || query.includes('year') || query.includes('annual'))
    return 'year'
  return undefined
}

/**
 * Get additional context based on query classification
 * This can be used to fetch more specific data
 */
export function getContextHints(classification: QueryClassification): string[] {
  const hints: string[] = []

  switch (classification.intent) {
    case 'finance':
      hints.push('Include specific invoice numbers and amounts')
      hints.push('Mention payment due dates')
      if (classification.keywords.includes('owe')) {
        hints.push('Focus on overdue invoices and AR aging')
      }
      break

    case 'schedule':
      hints.push('Include specific dates and times')
      hints.push('Mention associate names and locations')
      if (classification.timeframe === 'today') {
        hints.push("Focus on today's shifts only")
      } else if (classification.timeframe === 'week') {
        hints.push('Show the full week schedule')
      }
      break

    case 'team':
      hints.push('Include associate names and performance metrics')
      hints.push('Mention service ratings and completion rates')
      break

    case 'issues':
      hints.push('List all open issues with severity levels')
      hints.push('Include location and client names')
      hints.push('Mention days since issue was reported')
      break

    case 'clients':
      hints.push('Include revenue totals and invoice counts')
      hints.push('Mention active service agreements')
      break

    case 'locations':
      hints.push('Include location names and assigned associates')
      hints.push('Mention recent service logs and ratings')
      break

    case 'performance':
      hints.push('Include specific metrics and percentages')
      hints.push('Compare to previous periods if possible')
      hints.push('Highlight trends (improving or declining)')
      break
  }

  return hints
}

/**
 * Generate a focused prompt based on query classification
 */
export function enhancePromptWithClassification(
  userQuery: string,
  classification: QueryClassification,
  context: string
): string {
  const hints = getContextHints(classification)
  const hintText = hints.length > 0 ? `\n\nFocus areas:\n${hints.map((h) => `- ${h}`).join('\n')}` : ''

  return `User Question: ${userQuery}

Query Classification:
- Intent: ${classification.intent}
- Confidence: ${(classification.confidence * 100).toFixed(0)}%
- Time Context: ${classification.timeframe || 'not specified'}
${hintText}

Current Business Context:
${context}

Please provide a helpful, specific response based on the available data:`
}
