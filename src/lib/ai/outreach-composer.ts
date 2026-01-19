import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''
)

export interface ProspectData {
  companyName: string
  businessType?: string
  industry?: string
  address?: {
    city?: string
    state?: string
  }
  website?: string
  priceLevel?: string
  contacts?: Array<{
    firstName?: string
    lastName?: string
    title?: string
    email?: string
    phone?: string
  }>
  notes?: string
  aiScore?: number
  aiScoreReason?: string
}

export interface TemplateData {
  name: string
  category: string
  channel: string
  subject?: string
  body: string
  variables?: string[]
  aiInstructions?: string
}

export interface ComposerOptions {
  channel: 'email' | 'sms' | 'linkedin' | 'instagram_dm'
  prospect: ProspectData
  template?: TemplateData
  tone?: 'professional' | 'friendly' | 'casual' | 'warm'
  purpose?: 'cold_outreach' | 'follow_up' | 're_engagement'
  customInstructions?: string
}

export interface GeneratedMessage {
  subject?: string
  body: string
  channel: string
  personalizationNotes?: string
}

/**
 * Generate a personalized outreach message using AI
 */
export async function generateOutreachMessage(
  options: ComposerOptions
): Promise<GeneratedMessage> {
  const { channel, prospect, template, tone = 'friendly', purpose = 'cold_outreach', customInstructions } = options

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    // Build context about the prospect
    const prospectContext = buildProspectContext(prospect)
    
    // Build template context if provided
    const templateContext = template ? buildTemplateContext(template) : ''

    // Build the prompt
    const prompt = buildComposerPrompt({
      channel,
      prospectContext,
      templateContext,
      tone,
      purpose,
      customInstructions,
    })

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Parse the response
    const parsed = parseAIResponse(text, channel)

    return {
      subject: parsed.subject,
      body: parsed.body,
      channel,
      personalizationNotes: parsed.notes,
    }
  } catch (error) {
    console.error('Error generating outreach message:', error)
    throw new Error('Failed to generate outreach message')
  }
}

function buildProspectContext(prospect: ProspectData): string {
  let context = `PROSPECT INFORMATION:
Company Name: ${prospect.companyName}
`

  if (prospect.businessType) {
    context += `Business Type: ${prospect.businessType}\n`
  }

  if (prospect.industry) {
    context += `Industry: ${prospect.industry}\n`
  }

  if (prospect.address?.city) {
    context += `Location: ${prospect.address.city}`
    if (prospect.address.state) {
      context += `, ${prospect.address.state}`
    }
    context += '\n'
  }

  if (prospect.priceLevel) {
    context += `Price Level: ${prospect.priceLevel}\n`
  }

  if (prospect.contacts && prospect.contacts.length > 0) {
    const contact = prospect.contacts[0]
    context += `\nCONTACT PERSON:\n`
    if (contact.firstName) context += `First Name: ${contact.firstName}\n`
    if (contact.lastName) context += `Last Name: ${contact.lastName}\n`
    if (contact.title) context += `Title: ${contact.title}\n`
  }

  if (prospect.website) {
    context += `Website: ${prospect.website}\n`
  }

  if (prospect.notes) {
    context += `\nNOTES:\n${prospect.notes}\n`
  }

  if (prospect.aiScoreReason) {
    context += `\nAI INSIGHTS:\n${prospect.aiScoreReason}\n`
  }

  return context
}

function buildTemplateContext(template: TemplateData): string {
  let context = `\nTEMPLATE TO USE AS REFERENCE:
Name: ${template.name}
Category: ${template.category}
Channel: ${template.channel}
`

  if (template.subject) {
    context += `Subject: ${template.subject}\n`
  }

  context += `Body:\n${template.body}\n`

  if (template.aiInstructions) {
    context += `\nTemplate Instructions: ${template.aiInstructions}\n`
  }

  if (template.variables && template.variables.length > 0) {
    context += `\nAvailable Variables: ${template.variables.join(', ')}\n`
  }

  return context
}

function buildComposerPrompt(options: {
  channel: string
  prospectContext: string
  templateContext: string
  tone: string
  purpose: string
  customInstructions?: string
}): string {
  const { channel, prospectContext, templateContext, tone, purpose, customInstructions } = options

  const channelGuidelines = {
    email: 'Professional email format with clear subject line. Keep body concise (3-4 paragraphs max).',
    sms: 'Short, friendly text message. Maximum 160 characters. No subject line.',
    linkedin: 'Professional LinkedIn message. 2-3 short paragraphs. Personal and conversational.',
    instagram_dm: 'Casual, friendly Instagram DM. Keep it brief and authentic. Use emojis sparingly.',
  }

  const toneGuidelines = {
    professional: 'Formal, business-like, respectful',
    friendly: 'Warm, approachable, personable',
    casual: 'Relaxed, conversational, authentic',
    warm: 'Very friendly, enthusiastic, personal',
  }

  const purposeGuidelines = {
    cold_outreach: 'First contact - introduce Urban Simple and our specialized hospitality cleaning services',
    follow_up: 'Follow-up message - reference previous contact and provide additional value',
    re_engagement: 'Re-engagement - reconnect with prospect who went cold',
  }

  return `You are an expert outreach copywriter for Urban Simple, a hospitality-focused commercial cleaning company based in Austin, Texas.

ABOUT URBAN SIMPLE:
- We specialize EXCLUSIVELY in hospitality cleaning: restaurants, commercial kitchens, hotel dining facilities, resorts, bars, breweries, and food service establishments
- Our core service is NIGHTLY CLEANING - we come in after closing to deep-clean kitchens, dining areas, bars, and back-of-house areas
- We understand the unique needs of the food service industry: health code compliance, grease removal, sanitization, floor care, and maintaining pristine front-of-house presentation
- We help restaurants and kitchens pass health inspections with flying colors
- Based in Austin, TX - we serve the vibrant Austin food and hospitality scene
- Key value propositions:
  * Let your kitchen staff focus on food, not cleaning
  * Consistent nightly cleaning means you open fresh every day
  * Health department ready at all times
  * Professional crews trained specifically for hospitality environments
  * Flexible scheduling that works around your business hours

${prospectContext}

${templateContext ? templateContext : 'No template provided - create original message.'}

TASK: Write a personalized ${channel} message for ${purpose}.

REQUIREMENTS:
- Channel: ${channel}
- Tone: ${toneGuidelines[tone as keyof typeof toneGuidelines]}
- Purpose: ${purposeGuidelines[purpose as keyof typeof purposeGuidelines]}
- ${channelGuidelines[channel as keyof typeof channelGuidelines]}

${customInstructions ? `\nADDITIONAL INSTRUCTIONS:\n${customInstructions}\n` : ''}

IMPORTANT GUIDELINES:
- Personalize using prospect's company name, location, and business type
- Mention specific benefits relevant to their industry (hospitality)
- Keep it concise and scannable
- Include a clear call-to-action
- Sound human, not robotic
- Don't use generic phrases like "I hope this email finds you well"
- Show you've done research about their business

CRITICAL: Generate ONE complete, ready-to-send message. Do NOT:
- Provide multiple options or alternatives to choose from
- Include bracketed placeholders like [Option A] or [Option B]
- Suggest different sentence variations
- Add comments or notes within the message
- Include any meta-text like "Here's your email" or "Choose between"

The message should be final and polished - ready to send as-is without any editing required.

OUTPUT FORMAT:
${channel === 'email' ? 'Subject: [your subject line here]\n\n' : ''}Body:
[your complete message here]

${channel === 'email' ? 'Provide both subject and body as a single, complete email.' : 'Provide only the message body (no subject line).'}`
}

function parseAIResponse(text: string, channel: string): {
  subject?: string
  body: string
  notes?: string
} {
  let subject: string | undefined
  let body = text

  // Try to extract subject if it's an email
  if (channel === 'email') {
    const subjectMatch = text.match(/Subject:\s*(.+?)(?:\n|$)/i)
    if (subjectMatch) {
      subject = subjectMatch[1].trim()
      body = text.replace(/Subject:\s*.+?\n/i, '').trim()
    }
  }

  // Remove "Body:" prefix if present
  body = body.replace(/^Body:\s*/i, '').trim()

  return {
    subject,
    body,
  }
}

export interface SequenceStepOptions {
  channel: 'email' | 'sms' | 'linkedin' | 'instagram_dm'
  stepNumber: number
  totalSteps: number
  sequenceName: string
  sequenceDescription?: string
  tone?: 'professional' | 'friendly' | 'casual' | 'warm'
  previousStepsContext?: string[]
}

/**
 * Generate content for a sequence step using AI
 */
export async function generateSequenceStepContent(
  options: SequenceStepOptions
): Promise<{ subject?: string; body: string }> {
  const {
    channel,
    stepNumber,
    totalSteps,
    sequenceName,
    sequenceDescription,
    tone = 'friendly',
    previousStepsContext = [],
  } = options

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const channelGuidelines = {
      email: 'Professional email format with clear subject line. Keep body concise (3-4 paragraphs max).',
      sms: 'Short, friendly text message. Maximum 160 characters. No subject line.',
      linkedin: 'Professional LinkedIn message. 2-3 short paragraphs. Personal and conversational.',
      instagram_dm: 'Casual, friendly Instagram DM. Keep it brief and authentic. Use emojis sparingly.',
    }

    const toneGuidelines = {
      professional: 'Formal, business-like, respectful',
      friendly: 'Warm, approachable, personable',
      casual: 'Relaxed, conversational, authentic',
      warm: 'Very friendly, enthusiastic, personal',
    }

    const stepTypes: Record<number, string> = {
      1: 'Initial outreach - introduce Urban Simple\'s nightly hospitality cleaning services, mention we specialize in restaurants/kitchens',
      2: 'Follow-up - reference the initial message, highlight a specific benefit like health code compliance or letting kitchen staff focus on food',
      3: 'Value add - mention how consistent nightly cleaning helps restaurants open fresh every day, or reference health inspection readiness',
      4: 'Soft check-in - friendly reminder, acknowledge they\'re busy running their establishment, ask if timing is better in the future',
      5: 'Final follow-up - last attempt, keep it brief, offer to reconnect when they\'re ready to explore cleaning solutions',
    }

    const stepType = stepTypes[stepNumber] || stepTypes[Math.min(stepNumber, 5)]

    const previousContext = previousStepsContext.length > 0
      ? `\nPREVIOUS STEPS IN SEQUENCE:\n${previousStepsContext.map((c, i) => `Step ${i + 1}: ${c.substring(0, 100)}...`).join('\n')}\n`
      : ''

    const prompt = `You are an expert outreach copywriter for Urban Simple, a hospitality-focused commercial cleaning company based in Austin, Texas.

ABOUT URBAN SIMPLE:
- We specialize EXCLUSIVELY in hospitality cleaning: restaurants, commercial kitchens, hotel dining facilities, resorts, bars, breweries, and food service establishments
- Our core service is NIGHTLY CLEANING - we come in after closing to deep-clean kitchens, dining areas, bars, and back-of-house areas
- We understand the unique needs of the food service industry: health code compliance, grease removal, sanitization, floor care, and maintaining pristine front-of-house presentation
- We help restaurants and kitchens pass health inspections with flying colors
- Based in Austin, TX - we serve the vibrant Austin food and hospitality scene
- Key value propositions:
  * Let your kitchen staff focus on food, not cleaning
  * Consistent nightly cleaning means you open fresh every day
  * Health department ready at all times
  * Professional crews trained specifically for hospitality environments
  * Flexible scheduling that works around your business hours

TASK: Generate a ${channel} message for STEP ${stepNumber} of ${totalSteps} in an outreach sequence.

SEQUENCE INFO:
Name: ${sequenceName}
${sequenceDescription ? `Description: ${sequenceDescription}` : ''}
${previousContext}

STEP CONTEXT:
- This is step ${stepNumber} of ${totalSteps}
- Step type: ${stepType}
- Channel: ${channel}
- Tone: ${toneGuidelines[tone]}
- ${channelGuidelines[channel]}

IMPORTANT GUIDELINES:
- This is a TEMPLATE that will be personalized later with merge fields
- Use these placeholders: {{company_name}}, {{contact_name}}, {{location}}
- Keep messages progressively shorter as the sequence continues
- Each step should have a unique angle - don't repeat the same pitch
- Reference previous messages naturally (for steps 2+)
- Include a clear but non-pushy call-to-action

CRITICAL: Generate ONE complete, ready-to-use template. Do NOT:
- Provide multiple options or alternatives
- Include bracketed placeholders like [Option A] or [Option B]
- Add meta-text or comments

OUTPUT FORMAT:
${channel === 'email' ? 'Subject: [your subject line here]\n\n' : ''}Body:
[your complete message template here]

${channel === 'email' ? 'Provide both subject and body.' : 'Provide only the message body.'}`

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    // Parse the response
    const parsed = parseAIResponse(text, channel)

    return {
      subject: parsed.subject,
      body: parsed.body,
    }
  } catch (error) {
    console.error('Error generating sequence step content:', error)
    throw new Error('Failed to generate sequence step content')
  }
}

/**
 * Determine the best channel for a prospect based on available contact info
 */
export function determineBestChannel(prospect: ProspectData): 'email' | 'sms' | 'linkedin' | 'instagram_dm' {
  // Check for email first
  if (prospect.contacts?.some((c) => c.email)) {
    return 'email'
  }

  // Check for phone (SMS)
  if (prospect.contacts?.some((c) => c.phone)) {
    return 'sms'
  }

  // For restaurants/hospitality, prefer Instagram
  if (prospect.businessType === 'restaurant' || prospect.businessType === 'bar') {
    return 'instagram_dm'
  }

  // Default to LinkedIn for B2B
  return 'linkedin'
}
