import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { PulseBriefingView } from '@/components/pulse/pulse-briefing-view'

export default async function PulsePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'SUPER_ADMIN') {
    redirect('/')
  }

  // Get today's date at midnight UTC
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  // Get today's briefing
  const briefing = await prisma.pulseBriefing.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date: today,
      },
    },
    include: {
      items: {
        include: {
          topic: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  // Get active topics count
  const topicsCount = await prisma.pulseTopic.count({
    where: {
      userId: user.id,
      isActive: true,
    },
  })

  // Mark as read if first view
  if (briefing && !briefing.readAt) {
    await prisma.pulseBriefing.update({
      where: { id: briefing.id },
      data: { readAt: new Date() },
    })
  }

  return (
    <div className="min-h-screen">
      <PulseBriefingView
        briefing={briefing}
        topicsCount={topicsCount}
        userName={user.firstName}
      />
    </div>
  )
}
