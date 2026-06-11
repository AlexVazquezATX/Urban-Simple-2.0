import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '')

// GET /api/tasks/focus - Get today's focus tasks
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const focusTasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        companyId: user.companyId,
        isFocusTask: true,
        focusDate: {
          gte: today,
          lt: tomorrow,
        },
        status: { in: ['todo', 'in_progress'] },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        goal: {
          select: {
            id: true,
            title: true,
            color: true,
            period: true,
          },
        },
        links: true,
      },
      orderBy: {
        focusPriority: 'asc',
      },
    })

    return NextResponse.json({
      focusTasks,
      focusDate: today.toISOString().split('T')[0],
    })
  } catch (error) {
    console.error('Error fetching focus tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch focus tasks' },
      { status: 500 }
    )
  }
}

// POST /api/tasks/focus - Generate AI daily focus
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    // Clear existing focus tasks for today
    await prisma.task.updateMany({
      where: {
        userId: user.id,
        companyId: user.companyId,
        isFocusTask: true,
        focusDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      data: {
        isFocusTask: false,
        focusDate: null,
        focusReason: null,
        focusPriority: null,
      },
    })

    // Get all open tasks with relevant context
    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        companyId: user.companyId,
        status: { in: ['todo', 'in_progress'] },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        goal: {
          select: {
            id: true,
            title: true,
            period: true,
          },
        },
        links: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (tasks.length === 0) {
      return NextResponse.json({
        focusTasks: [],
        message: 'No open tasks to prioritize',
        summary: 'Add some tasks to get started with AI-powered daily focus!',
      })
    }

    // Prepare task data for AI
    const taskData = tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate?.toISOString().split('T')[0],
      scheduledDate: task.scheduledDate?.toISOString().split('T')[0],
      project: task.project?.name,
      goal: task.goal ? { title: task.goal.title, period: task.goal.period } : null,
      isStarred: task.isStarred,
      linkedEntities: task.links.map(l => `${l.entityType}: ${l.entityLabel || l.entityId}`),
      isOverdue: task.dueDate && task.dueDate < today,
      daysPastDue: task.dueDate && task.dueDate < today
        ? Math.floor((today.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    }))

    // Heuristic fallback — used whenever the AI step fails for ANY reason
    // (missing key, model error, unparseable response), so Generate Focus
    // always produces a list when open tasks exist.
    const buildFallbackResponse = () => {
      const sortedTasks = [...taskData].sort((a, b) => {
        // Starred first
        if (a.isStarred && !b.isStarred) return -1
        if (!a.isStarred && b.isStarred) return 1
        // Overdue second
        if (a.isOverdue && !b.isOverdue) return -1
        if (!a.isOverdue && b.isOverdue) return 1
        // Tasks with goals third
        if (a.goal && !b.goal) return -1
        if (!a.goal && b.goal) return 1
        // Then by priority
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
               (priorityOrder[b.priority as keyof typeof priorityOrder] || 2)
      })

      return {
        focusTasks: sortedTasks.slice(0, 4).map((t, i) => ({
          id: t.id,
          priority: i + 1,
          reason: t.isStarred ? 'Starred - your priority' :
                  t.isOverdue ? 'Overdue - needs attention' :
                  t.goal ? `Supports: ${t.goal.title}` :
                  `${t.priority} priority task`,
        })),
        summary: 'Here are your top tasks for today based on priority and due dates.',
      }
    }

    // Generate AI recommendations
    const prompt = `You are a productivity assistant helping a small business owner (cleaning services company) prioritize their daily tasks.

Today's date: ${today.toISOString().split('T')[0]}

Here are their open tasks:
${JSON.stringify(taskData, null, 2)}

Select 3-5 tasks they should focus on today. Prioritize based on:
1. Starred tasks (user's manual priority - respect their choices)
2. Overdue tasks (highest priority - these MUST be addressed)
3. Tasks due today or tomorrow
4. Tasks linked to weekly goals (support goal achievement)
5. High/urgent priority tasks
6. Tasks already "in_progress" (momentum)
7. Tasks linked to clients or invoices (business impact)

Return a JSON response with this exact structure:
{
  "focusTasks": [
    {
      "id": "task-id-here",
      "priority": 1,
      "reason": "Brief reason why this is priority #1 (max 15 words)"
    }
  ],
  "summary": "A brief, encouraging 1-2 sentence summary of the day's focus (conversational, not robotic)"
}

Focus on being helpful and specific. If a task supports a weekly goal, mention it. The summary should feel like advice from a smart assistant, not a generic statement.`

    let aiResponse
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
      const result = await model.generateContent(prompt)
      const responseText = result.response.text()

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      aiResponse = JSON.parse(jsonMatch[0])
    } catch (aiError) {
      console.error('AI focus generation failed, using heuristic fallback:', aiError)
      aiResponse = buildFallbackResponse()
    }

    // Drop any hallucinated task ids, and fall back if nothing valid survives
    // (the focus flags were already cleared above, so we must set SOMETHING).
    const validIds = new Set(tasks.map(t => t.id))
    let focusSelections = (aiResponse.focusTasks || []).filter(
      (ft: { id: string }) => validIds.has(ft.id)
    )
    if (focusSelections.length === 0) {
      aiResponse = buildFallbackResponse()
      focusSelections = aiResponse.focusTasks
    }

    // Update tasks with focus data
    for (const focusTask of focusSelections) {
      await prisma.task.update({
        where: { id: focusTask.id },
        data: {
          isFocusTask: true,
          focusDate: today,
          focusReason: focusTask.reason,
          focusPriority: focusTask.priority,
        },
      })
    }

    // Fetch updated focus tasks
    const updatedFocusTasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        companyId: user.companyId,
        isFocusTask: true,
        focusDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        goal: {
          select: {
            id: true,
            title: true,
            color: true,
            period: true,
          },
        },
        links: true,
      },
      orderBy: {
        focusPriority: 'asc',
      },
    })

    return NextResponse.json({
      focusTasks: updatedFocusTasks,
      summary: aiResponse.summary,
      focusDate: today.toISOString().split('T')[0],
    })
  } catch (error) {
    console.error('Error generating focus:', error)
    return NextResponse.json(
      { error: 'Failed to generate focus' },
      { status: 500 }
    )
  }
}
