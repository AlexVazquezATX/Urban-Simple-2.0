import { prisma } from '@/lib/db'
import { GoogleGenAI, Type } from '@google/genai'
import { buildBusinessContext, formatContextForAI } from '@/features/ai/lib/context-builder'
import type {
  GenerationOptions,
  GenerationResult,
  GeneratedContent,
  WebSearchResult,
  BusinessInsightsData,
} from '../types/pulse-types'

// Initialize Gemini client - check both possible env var names
const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''
const getAI = () => new GoogleGenAI({ apiKey: GEMINI_API_KEY })

// Number of items to generate per topic
const ITEMS_PER_TOPIC = 2
const MAX_TOTAL_ITEMS = 12

/**
 * Generate the daily briefing for a user
 */
export async function generateDailyBriefing(
  options: GenerationOptions
): Promise<GenerationResult> {
  const startTime = Date.now()
  const errors: string[] = []
  let itemsGenerated = 0
  let imagesGenerated = 0

  try {
    const { userId, forceRegenerate, topicIds } = options
    const date = options.date || new Date()
    date.setUTCHours(0, 0, 0, 0)

    // Check for existing briefing
    const existingBriefing = await prisma.pulseBriefing.findUnique({
      where: {
        userId_date: { userId, date },
      },
    })

    if (existingBriefing && !forceRegenerate) {
      if (existingBriefing.status === 'ready') {
        return {
          success: true,
          briefingId: existingBriefing.id,
          itemsGenerated: 0,
          imagesGenerated: 0,
          duration: Date.now() - startTime,
          errors: ['Briefing already exists for today'],
        }
      }
    }

    // Delete existing briefing if regenerating
    if (existingBriefing && forceRegenerate) {
      await prisma.pulseBriefing.delete({
        where: { id: existingBriefing.id },
      })
    }

    // Get active topics
    const topics = await prisma.pulseTopic.findMany({
      where: {
        userId,
        isActive: true,
        ...(topicIds ? { id: { in: topicIds } } : {}),
      },
      orderBy: { priority: 'desc' },
    })

    if (topics.length === 0) {
      return {
        success: false,
        itemsGenerated: 0,
        imagesGenerated: 0,
        duration: Date.now() - startTime,
        errors: ['No active topics found'],
      }
    }

    // Create the briefing record
    const briefing = await prisma.pulseBriefing.create({
      data: {
        userId,
        date,
        status: 'generating',
        aiModel: 'gemini-2.0-flash-exp',
      },
    })

    try {
      // Generate content for each topic in parallel
      console.log(`Generating content for ${topics.length} topics...`)

      const contentPromises = topics.map((topic) =>
        generateTopicContent(topic.name, topic.keywords, topic.category)
          .then((content) => {
            console.log(`Topic "${topic.name}": generated ${content.length} items`)
            return content
          })
          .catch((err) => {
            console.error(`Topic "${topic.name}" FAILED:`, err.message)
            errors.push(`Topic "${topic.name}": ${err.message}`)
            return []
          })
      )

      const allContent = await Promise.all(contentPromises)
      console.log(`Total raw content items: ${allContent.flat().length}`)
      const flatContent = allContent.flat().slice(0, MAX_TOTAL_ITEMS)
      console.log(`After slice: ${flatContent.length} items`)

      // Get business insights
      let businessInsights: BusinessInsightsData | null = null
      try {
        businessInsights = await getBusinessInsights()
      } catch (err: any) {
        errors.push(`Business insights: ${err.message}`)
      }

      // Generate greeting and summary
      const [greeting, summary, inspirationQuote] = await Promise.all([
        generateGreeting(topics.map((t) => t.name)),
        generateExecutiveSummary(flatContent, businessInsights),
        generateInspirationQuote(),
      ])

      // Generate title for the day
      const title = generateDailyTitle()

      // Create briefing items with images
      let sortOrder = 0

      // Add business insights as first items
      if (businessInsights) {
        const businessItems = createBusinessInsightItems(businessInsights)
        for (const item of businessItems) {
          try {
            await prisma.pulseBriefingItem.create({
              data: {
                briefingId: briefing.id,
                title: item.title,
                summary: item.summary,
                itemType: 'business_kpi',
                category: 'business',
                sortOrder: sortOrder++,
                relevanceScore: 1.0,
              },
            })
            itemsGenerated++
          } catch (err: any) {
            errors.push(`Business item "${item.title}": ${err.message}`)
          }
        }
      }

      // Add content items with AI-generated images
      let contentIndex = 0
      for (const content of flatContent) {
        try {
          // Find matching topic
          const matchingTopic = topics.find((t) =>
            t.keywords.some((k) =>
              content.keywords.some((ck) =>
                ck.toLowerCase().includes(k.toLowerCase())
              )
            )
          )

          // Generate AI image if we have an image prompt from the content
          let imageBase64: string | null = null
          const imagePromptText = (content as any).imagePrompt
          if (imagePromptText) {
            console.log(`Generating image for: ${content.title}`)
            imageBase64 = await generateHeroImage(imagePromptText)
            if (imageBase64) {
              imagesGenerated++
              console.log(`Image generated successfully for: ${content.title}`)
            }
          }

          // Fallback to gradient metadata if image generation fails
          const imageMeta = generateItemImageMeta(content.title, content.category, contentIndex)

          await prisma.pulseBriefingItem.create({
            data: {
              briefingId: briefing.id,
              topicId: matchingTopic?.id,
              title: content.title,
              summary: content.summary,
              content: content.content,
              sourceUrl: content.sourceUrl,
              sourceName: content.sourceName,
              imagePrompt: imagePromptText || `${imageMeta.imageGradient}|${imageMeta.imagePattern}`,
              imageBase64: imageBase64, // Store actual AI-generated image
              itemType: 'article',
              category: content.category,
              sentiment: content.sentiment,
              relevanceScore: content.relevanceScore,
              sortOrder: sortOrder++,
            },
          })
          itemsGenerated++
          contentIndex++
        } catch (err: any) {
          errors.push(`Item "${content.title}": ${err.message}`)
        }
      }

      // Update briefing with greeting, summary, and mark as ready
      await prisma.pulseBriefing.update({
        where: { id: briefing.id },
        data: {
          title,
          greeting,
          summary,
          inspirationQuote,
          status: 'ready',
          generatedAt: new Date(),
          generationTime: Date.now() - startTime,
        },
      })

      return {
        success: true,
        briefingId: briefing.id,
        itemsGenerated,
        imagesGenerated,
        duration: Date.now() - startTime,
        errors,
      }
    } catch (err: any) {
      // Mark briefing as failed
      await prisma.pulseBriefing.update({
        where: { id: briefing.id },
        data: {
          status: 'failed',
          errorMessage: err.message,
        },
      })
      throw err
    }
  } catch (error: any) {
    console.error('Error generating briefing:', error)
    return {
      success: false,
      itemsGenerated,
      imagesGenerated,
      duration: Date.now() - startTime,
      errors: [...errors, error.message],
    }
  }
}

/**
 * Generate content for a specific topic using AI
 */
async function generateTopicContent(
  topicName: string,
  keywords: string[],
  category: string
): Promise<GeneratedContent[]> {
  const ai = getAI()

  const prompt = `You are an expert editorial writer for a high-end business intelligence magazine. Generate ${ITEMS_PER_TOPIC} comprehensive, beautifully-written articles about "${topicName}".

Keywords to focus on: ${keywords.join(', ')}
Category: ${category}

**CRITICAL: GENERATE VALID HTML CONTENT**

The "content" field MUST contain properly formatted HTML with the following structure:

**MANDATORY ELEMENTS (include ALL of these):**

1. **OPENING PARAGRAPH**: Start with <p> tags containing 2-3 sentences that hook the reader.

2. **SECTION HEADINGS**: Include 2-3 <h2> tags with evocative, intriguing titles.
   Example: <h2>The New Frontier of Possibility</h2>

3. **SUB-HEADINGS**: Include 1-2 <h3> tags for sub-sections.
   Example: <h3>Unlocking Business Value</h3>

4. **PARAGRAPHS**: Use <p> tags for each paragraph. Keep them SHORT (2-3 sentences max).
   Example: <p>The landscape is shifting. Business leaders who adapt now will thrive.</p>

5. **PULL QUOTES**: Include 1-2 <blockquote> tags with powerful, quotable insights.
   Example: <blockquote>"The future belongs to those who prepare for it today."</blockquote>

6. **BULLET LISTS**: Include at least ONE <ul> with <li> items for key takeaways.
   Example:
   <ul>
     <li><strong>Strategic Advantage:</strong> Early adopters gain market positioning.</li>
     <li><strong>Cost Efficiency:</strong> Automation reduces operational overhead by 40%.</li>
     <li><strong>Customer Experience:</strong> Personalized interactions drive loyalty.</li>
   </ul>

7. **EMPHASIS**: Use <strong> tags to highlight key phrases within paragraphs.
   Example: <p>The key to success lies in <strong>strategic implementation</strong> rather than rapid deployment.</p>

**CONTENT REQUIREMENTS:**
- 400-600 words of rich, substantive content
- Professional, authoritative tone
- Actionable insights for business owners
- Recent developments and trends (as of today)
- Forward-looking analysis with concrete examples

**EXAMPLE CONTENT STRUCTURE:**
<p>Opening hook paragraph with strong lead...</p>
<h2>Evocative Section Title</h2>
<p>First paragraph of section...</p>
<p>Second paragraph with <strong>emphasis</strong> on key points...</p>
<blockquote>"A powerful quote that captures the essence."</blockquote>
<h3>Subsection Title</h3>
<p>Content for subsection...</p>
<ul>
  <li><strong>Key Point 1:</strong> Description of the point.</li>
  <li><strong>Key Point 2:</strong> Description of another point.</li>
</ul>
<h2>Another Major Section</h2>
<p>More content...</p>
<p>Closing paragraph with call to action or forward-looking statement.</p>`

  try {
    console.log(`Calling Gemini for topic: ${topicName}`)

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Compelling headline (50-80 chars)" },
                  summary: { type: Type.STRING, description: "Executive summary (2-3 sentences) for card preview" },
                  content: { type: Type.STRING, description: "Full HTML content with h2, h3, blockquote, ul, li tags. 400-600 words." },
                  imagePrompt: { type: Type.STRING, description: "Detailed visual description for AI image generation (cinematic, photorealistic, editorial)" },
                  sentiment: { type: Type.STRING, description: "positive, neutral, or negative" },
                  relevanceScore: { type: Type.NUMBER, description: "0.0 to 1.0" },
                  keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['title', 'summary', 'content', 'imagePrompt', 'sentiment'],
              },
            },
          },
          required: ['items'],
        },
      },
    })

    if (!response.text) {
      throw new Error('No response from Gemini')
    }

    const data = JSON.parse(response.text)
    const items = data.items || []
    console.log(`Parsed ${items.length} items for ${topicName}`)

    return items.map((item: any) => ({
      title: item.title || 'Untitled',
      summary: item.summary || '',
      content: item.content || '',
      imagePrompt: item.imagePrompt || '',
      category,
      sentiment: item.sentiment || 'neutral',
      relevanceScore: item.relevanceScore || 0.5,
      keywords: item.keywords || keywords,
    }))
  } catch (error: any) {
    console.error(`Error generating content for ${topicName}:`, error.message)
    throw error
  }
}

/**
 * Generate a personalized greeting
 */
async function generateGreeting(topicNames: string[]): Promise<string> {
  const ai = getAI()
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  const prompt = `Generate a warm, personalized greeting for a busy business owner named Alex starting their ${timeOfDay}.

They're interested in: ${topicNames.join(', ')}

Make it:
- Warm and encouraging (like a trusted advisor)
- Brief (1-2 sentences)
- Reference the time of day naturally
- Set a positive, productive tone

Do NOT use asterisks or markdown. Just plain text.`

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: { parts: [{ text: prompt }] },
    })
    return result.text?.trim() || `Good ${timeOfDay}, Alex! Here's your daily briefing to help you stay ahead.`
  } catch (error) {
    return `Good ${timeOfDay}, Alex! Here's your daily briefing to help you stay ahead.`
  }
}

/**
 * Generate an executive summary of all content
 */
async function generateExecutiveSummary(
  content: GeneratedContent[],
  businessInsights: BusinessInsightsData | null
): Promise<string> {
  const ai = getAI()
  const contentSummary = content
    .map((c) => `- ${c.title}: ${c.summary.slice(0, 100)}...`)
    .join('\n')

  const businessContext = businessInsights
    ? `Business Context:
- Revenue last 7 days: $${businessInsights.revenue.last7Days.toLocaleString()}
- AR Current: $${businessInsights.arAging.current.toLocaleString()}
- Active Team: ${businessInsights.team.activeAssociates} associates`
    : ''

  const prompt = `Create a brief executive summary (3-4 sentences) of today's briefing for Alex.

Today's Content:
${contentSummary}

${businessContext}

The summary should:
- Highlight the most important themes
- Connect insights to business implications
- Be actionable and forward-looking
- End with an encouraging note

Do NOT use asterisks or markdown. Just plain text.`

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: { parts: [{ text: prompt }] },
    })
    return result.text?.trim() || 'Your daily briefing is ready with insights across your topics of interest.'
  } catch (error) {
    return 'Your daily briefing is ready with insights across your topics of interest.'
  }
}

/**
 * Generate a daily inspiration quote
 */
async function generateInspirationQuote(): Promise<string> {
  const ai = getAI()
  const prompt = `Generate an inspiring quote for a business owner to start their day. It can be:
- A famous quote about business, leadership, or success
- An original motivational thought
- A practical wisdom snippet

Format: "The quote itself" - Attribution (if applicable)

Keep it brief and impactful. Do NOT use asterisks or markdown.`

  try {
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: { parts: [{ text: prompt }] },
    })
    return result.text?.trim() || '"The only way to do great work is to love what you do." - Steve Jobs'
  } catch (error) {
    return '"The only way to do great work is to love what you do." - Steve Jobs'
  }
}

/**
 * Generate a title for today's briefing
 */
function generateDailyTitle(): string {
  const date = new Date()
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }
  return date.toLocaleDateString('en-US', options)
}

/**
 * Generate hero image using Gemini 3 Pro Image
 */
async function generateHeroImage(prompt: string): Promise<string | null> {
  const ai = getAI()
  try {
    const enhancedPrompt = `Cinematic photography, high resolution, 8k, commercial editorial style, professional lighting, sharp focus: ${prompt}`

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [{ text: enhancedPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    })

    // Extract base64 image from response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if ((part as any).inlineData) {
        const inlineData = (part as any).inlineData
        // Return just the base64 data (without the data URL prefix) for storage
        return inlineData.data
      }
    }

    console.log('No image data in response')
    return null
  } catch (error: any) {
    console.error('Image generation error:', error.message)
    return null
  }
}

/**
 * Generate image metadata for a briefing item
 * Since Gemini 3 Pro Image isn't available yet, we use gradient-based visuals
 * stored as metadata that the frontend renders beautifully
 */
function generateItemImageMeta(
  title: string,
  category: string,
  index: number
): { imageGradient: string; imagePattern: string } {
  // Beautiful gradient combinations for each category
  const categoryGradients: Record<string, string[]> = {
    tech: [
      'from-blue-600 via-indigo-600 to-purple-700',
      'from-cyan-500 via-blue-600 to-indigo-700',
      'from-violet-600 via-purple-600 to-blue-700',
    ],
    business: [
      'from-emerald-600 via-teal-600 to-cyan-700',
      'from-green-500 via-emerald-600 to-teal-700',
      'from-teal-500 via-cyan-600 to-blue-700',
    ],
    local: [
      'from-orange-500 via-amber-500 to-yellow-600',
      'from-rose-500 via-orange-500 to-amber-600',
      'from-amber-500 via-yellow-500 to-lime-600',
    ],
    industry: [
      'from-rose-600 via-pink-600 to-fuchsia-700',
      'from-pink-500 via-rose-600 to-red-700',
      'from-fuchsia-500 via-pink-600 to-rose-700',
    ],
    personal: [
      'from-violet-600 via-purple-600 to-indigo-700',
      'from-purple-500 via-violet-600 to-blue-700',
      'from-indigo-500 via-violet-600 to-purple-700',
    ],
    general: [
      'from-slate-600 via-gray-600 to-zinc-700',
      'from-gray-500 via-slate-600 to-zinc-700',
      'from-zinc-500 via-gray-600 to-slate-700',
    ],
  }

  const patterns = ['dots', 'grid', 'waves', 'circles', 'abstract']

  const gradients = categoryGradients[category] || categoryGradients.general
  const gradient = gradients[index % gradients.length]
  const pattern = patterns[index % patterns.length]

  return {
    imageGradient: gradient,
    imagePattern: pattern,
  }
}

/**
 * Get business insights from Urban Simple data
 */
async function getBusinessInsights(): Promise<BusinessInsightsData> {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const [
    recentRevenue,
    previousRevenue,
    arAging,
    activeAssociates,
    upcomingShifts,
    completionRate,
    totalClients,
    atRiskClients,
  ] = await Promise.all([
    // Revenue last 7 days
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        paymentDate: { gte: sevenDaysAgo },
        status: 'completed',
      },
    }),

    // Revenue previous 7 days
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        paymentDate: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
        status: 'completed',
      },
    }),

    // AR aging buckets
    Promise.all([
      prisma.invoice.aggregate({
        _sum: { balanceDue: true },
        where: { balanceDue: { gt: 0 }, dueDate: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.invoice.aggregate({
        _sum: { balanceDue: true },
        where: {
          balanceDue: { gt: 0 },
          dueDate: {
            gte: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
            lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.invoice.aggregate({
        _sum: { balanceDue: true },
        where: {
          balanceDue: { gt: 0 },
          dueDate: {
            gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
            lt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.invoice.aggregate({
        _sum: { balanceDue: true },
        where: {
          balanceDue: { gt: 0 },
          dueDate: { lt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]),

    // Active associates
    prisma.user.count({
      where: { role: 'ASSOCIATE', isActive: true },
    }),

    // Upcoming shifts (next 7 days)
    prisma.shift.count({
      where: {
        date: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
        status: 'scheduled',
      },
    }),

    // Completion rate this month
    prisma.shift.groupBy({
      by: ['status'],
      where: {
        date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
      },
      _count: true,
    }),

    // Total clients
    prisma.client.count({ where: { status: 'active' } }),

    // At-risk clients (with overdue invoices)
    prisma.client.count({
      where: {
        invoices: {
          some: {
            balanceDue: { gt: 0 },
            dueDate: { lt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) },
          },
        },
      },
    }),
  ])

  const last7Days = Number(recentRevenue._sum.amount || 0)
  const previous7Days = Number(previousRevenue._sum.amount || 0)
  const revenueChange = previous7Days > 0
    ? ((last7Days - previous7Days) / previous7Days) * 100
    : 0

  const [current, overdue30, overdue60, overdue90] = arAging

  const completed = completionRate.find((r) => r.status === 'completed')?._count || 0
  const total = completionRate.reduce((sum, r) => sum + r._count, 0)
  const completionRateValue = total > 0 ? (completed / total) * 100 : 0

  return {
    revenue: {
      last7Days,
      previous7Days,
      change: revenueChange,
    },
    arAging: {
      current: Number(current._sum.balanceDue || 0),
      overdue30: Number(overdue30._sum.balanceDue || 0),
      overdue60: Number(overdue60._sum.balanceDue || 0),
      overdue90: Number(overdue90._sum.balanceDue || 0),
    },
    team: {
      activeAssociates,
      upcomingShifts,
      completionRate: completionRateValue,
    },
    clients: {
      total: totalClients,
      atRisk: atRiskClients,
    },
  }
}

/**
 * Create briefing items from business insights
 */
function createBusinessInsightItems(
  insights: BusinessInsightsData
): { title: string; summary: string }[] {
  const items: { title: string; summary: string }[] = []

  // Revenue insight
  const revenueDirection = insights.revenue.change >= 0 ? 'up' : 'down'
  const revenueEmoji = insights.revenue.change >= 0 ? '' : ''
  items.push({
    title: `Revenue ${revenueDirection} ${Math.abs(insights.revenue.change).toFixed(1)}%`,
    summary: `Last 7 days: $${insights.revenue.last7Days.toLocaleString()} vs previous week's $${insights.revenue.previous7Days.toLocaleString()}. ${insights.revenue.change >= 0 ? 'Great momentum - keep it up!' : 'Let\'s focus on collections and new business.'}`,
  })

  // AR insight
  const totalAR = insights.arAging.current + insights.arAging.overdue30 + insights.arAging.overdue60 + insights.arAging.overdue90
  if (totalAR > 0) {
    items.push({
      title: `AR Total: $${totalAR.toLocaleString()}`,
      summary: `Current: $${insights.arAging.current.toLocaleString()} | 30+ days: $${insights.arAging.overdue30.toLocaleString()} | 60+ days: $${insights.arAging.overdue60.toLocaleString()} | 90+ days: $${insights.arAging.overdue90.toLocaleString()}. ${insights.arAging.overdue90 > 0 ? 'Priority: Follow up on 90+ day accounts.' : 'AR is looking healthy!'}`,
    })
  }

  // Team insight
  items.push({
    title: `${insights.team.upcomingShifts} Shifts This Week`,
    summary: `${insights.team.activeAssociates} active associates with a ${insights.team.completionRate.toFixed(0)}% completion rate this month. ${insights.team.completionRate >= 90 ? 'Team is performing excellently!' : 'Room for improvement in shift completion.'}`,
  })

  return items
}
