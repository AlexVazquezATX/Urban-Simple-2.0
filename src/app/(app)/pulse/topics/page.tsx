import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { PulseTopicManager } from '@/components/pulse/pulse-topic-manager'

export default async function PulseTopicsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'SUPER_ADMIN') {
    redirect('/')
  }

  const topics = await prisma.pulseTopic.findMany({
    where: { userId: user.id },
    include: {
      _count: {
        select: {
          briefingItems: true,
        },
      },
    },
    orderBy: [{ priority: 'desc' }, { name: 'asc' }],
  })

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <PulseTopicManager topics={topics} />
    </div>
  )
}
