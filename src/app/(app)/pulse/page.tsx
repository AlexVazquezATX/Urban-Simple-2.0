import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getBriefingDate, resolveCompanyTimezone } from '@/features/pulse/lib/pulse-generator'
import { PulseBriefingView } from '@/components/pulse/pulse-briefing-view'

export default async function PulsePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'SUPER_ADMIN') {
    redirect('/')
  }

  // Resolve "today" in the company timezone so the morning briefing keeps
  // matching all day (a plain UTC midnight rolls to tomorrow after ~7pm CT).
  const timezone = await resolveCompanyTimezone(user.companyId)
  const today = getBriefingDate(new Date(), timezone)

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
