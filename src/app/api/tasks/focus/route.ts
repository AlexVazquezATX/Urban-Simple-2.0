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
      linkedEntities: task.links.map(l => `${l.entityType}: ${l.entityLabel || l.entityId}`),
      isOverdue: task.dueDate && task.dueDate < today,
      daysPastDue: task.dueDate && task.dueDate < today
        ? Math.floor((today.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    }))

    // Generate AI recommendations
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

    const prompt = `You are a productivity assistant helping a small business owner (cleaning services company) prioritize their daily tasks.

Today's date: ${today.toISOString().split('T')[0]}

Here are their open tasks:
${JSON.stringify(taskData, null, 2)}

Select 3-5 tasks they should focus on today. Prioritize based on:
1. Overdue tasks (highest priority - these MUST be addressed)
2. Tasks due today or tomorrow
3. High/urgent priority tasks
4. Tasks already "in_progress" (momentum)
5. Tasks linked to clients or invoices (business impact)

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

Focus on being helpful and specific. The summary should feel like advice from a smart assistant, not a generic statement.`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()

    // Parse AI response
    let aiResponse
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }
      aiResponse = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText)
      // Fallback: select top tasks manually
      const sortedTasks = [...taskData].sort((a, b) => {
        // Overdue first
        if (a.isOverdue && !b.isOverdue) return -1
        if (!a.isOverdue && b.isOverdue) return 1
        // Then by priority
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
               (priorityOrder[b.priority as keyof typeof priorityOrder] || 2)
      })

      aiResponse = {
        focusTasks: sortedTasks.slice(0, 4).map((t, i) => ({
          id: t.id,
          priority: i + 1,
          reason: t.isOverdue ? 'Overdue - needs attention' : `${t.priority} priority task`,
        })),
        summary: 'Here are your top tasks for today based on priority and due dates.',
      }
    }

    // Update tasks with focus data
    for (const focusTask of aiResponse.focusTasks || []) {
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
