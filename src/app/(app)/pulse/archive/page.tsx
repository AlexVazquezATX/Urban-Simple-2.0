import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { PulseArchiveView } from '@/components/pulse/pulse-archive-view'

export default async function PulseArchivePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'SUPER_ADMIN') {
    redirect('/')
  }

  // Get all briefings for archive
  const briefings = await prisma.pulseBriefing.findMany({
    where: {
      userId: user.id,
      status: 'ready',
    },
    select: {
      id: true,
      date: true,
      title: true,
      status: true,
      readAt: true,
      _count: {
        select: {
          items: true,
        },
      },
    },
    orderBy: { date: 'desc' },
    take: 90, // Last 90 days
  })

  // Get bookmarked items
  const bookmarkedItems = await prisma.pulseBriefingItem.findMany({
    where: {
      briefing: {
        userId: user.id,
      },
      isBookmarked: true,
    },
    include: {
      topic: {
        select: {
          id: true,
          name: true,
          category: true,
        },
      },
      briefing: {
        select: {
          date: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <PulseArchiveView briefings={briefings} bookmarkedItems={bookmarkedItems} />
    </div>
  )
}
