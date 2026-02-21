import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

// POST /api/growth/ai/generate-content - Generate outreach content using AI
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      prospectData,
      channel, // email, sms, linkedin, instagram_dm
      tone, // formal, friendly, casual, urgent
      purpose, // cold_outreach, follow_up, introduction, etc.
      customInstructions,
    } = body

    if (!prospectData || !channel) {
      return NextResponse.json(
        { error: 'Prospect data and channel are required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI API key not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    // Build context-aware prompt
    const prospectInfo = `
Company: ${prospectData.companyName || 'Unknown'}
Industry: ${prospectData.industry || 'Not specified'}
Business Type: ${prospectData.businessType || 'Not specified'}
Location: ${prospectData.address ? `${prospectData.address.city || ''}, ${prospectData.address.state || ''}` : 'Not specified'}
Contact: ${prospectData.contacts?.[0] ? `${prospectData.contacts[0].firstName} ${prospectData.contacts[0].lastName}` : 'Unknown'}
Contact Title: ${prospectData.contacts?.[0]?.title || 'Not specified'}
`

    const toneInstructions = {
      formal: 'Use professional, business-appropriate language. Be respectful and courteous.',
      friendly: 'Use a warm, approachable tone. Be personable but still professional.',
      casual: 'Use a relaxed, conversational tone. Be friendly and direct.',
      urgent: 'Create a sense of urgency while remaining professional. Highlight time-sensitive benefits.',
    }

    const purposeInstructions = {
      cold_outreach: 'This is a cold outreach to a prospect we have not contacted before. Introduce Urban Simple and our services.',
      follow_up: 'This is a follow-up to a previous conversation or email. Reference the previous interaction.',
      introduction: 'Introduce Urban Simple and explain how we can help their business.',
      proposal: 'Follow up on a proposal that was sent. Be helpful and answer any questions.',
    }

    const channelInstructions = {
      email: 'Write a professional email with a clear subject line suggestion. Keep it concise (2-3 paragraphs).',
      sms: 'Write a short text message (under 160 characters). Be direct and friendly.',
      linkedin: 'Write a LinkedIn message. Be professional but personable. Keep it brief.',
      instagram_dm: 'Write an Instagram DM. Be friendly and casual. Use emojis sparingly.',
    }

    const prompt = `You are a business development assistant for Urban Simple, a commercial kitchen cleaning service company.

${prospectInfo}

Channel: ${channel}
Tone: ${tone || 'friendly'}
Purpose: ${purpose || 'cold_outreach'}
${customInstructions ? `Custom Instructions: ${customInstructions}` : ''}

${channelInstructions[channel as keyof typeof channelInstructions] || channelInstructions.email}
${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.friendly}
${purposeInstructions[purpose as keyof typeof purposeInstructions] || purposeInstructions.cold_outreach}

Key points to include:
- Urban Simple provides commercial kitchen cleaning services
- We serve restaurants, hotels, and hospitality businesses
- We offer nightly cleaning, deep cleaning, and specialized services
- We're professional, reliable, and help businesses maintain health code compliance
- We're based in Texas (Austin, Dallas, San Antonio)

${channel === 'email' ? 'Provide both a subject line and email body. Format as JSON: {"subject": "...", "body": "..."}' : 'Provide the message content.'}

Be specific to their business type and location. Personalize the message.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse response
    let content: any = {}
    if (channel === 'email') {
      try {
        // Try to extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          content = JSON.parse(jsonMatch[0])
        } else {
          // Fallback: split by common patterns
          const subjectMatch = text.match(/subject[:\s]+(.+)/i)
          const bodyMatch = text.match(/body[:\s]+([\s\S]+)/i)
          content = {
            subject: subjectMatch ? subjectMatch[1].trim() : 'Introduction from Urban Simple',
            body: bodyMatch ? bodyMatch[1].trim() : text,
          }
        }
      } catch (error) {
        // If parsing fails, use the whole text as body
        content = {
          subject: 'Introduction from Urban Simple',
          body: text,
        }
      }
    } else {
      content = {
        message: text.trim(),
      }
    }

    return NextResponse.json({
      content,
      rawResponse: text,
    })
  } catch (error: any) {
    console.error('Error generating content:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate content' },
      { status: 500 }
    )
  }
}

