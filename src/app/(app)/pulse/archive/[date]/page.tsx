import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { PulseBriefingView } from '@/components/pulse/pulse-briefing-view'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Calendar } from 'lucide-react'

interface PageProps {
  params: Promise<{ date: string }>
}

export default async function ArchiveDatePage({ params }: PageProps) {
  const { date: dateStr } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (user.role !== 'SUPER_ADMIN') {
    redirect('/')
  }

  // Parse and validate date
  const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!dateMatch) {
    notFound()
  }

  const date = parseISO(dateStr)
  if (isNaN(date.getTime())) {
    notFound()
  }

  date.setUTCHours(0, 0, 0, 0)

  // Get the briefing for this date
  const briefing = await prisma.pulseBriefing.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date,
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

  if (!briefing) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/pulse/archive">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">
                {format(date, 'EEEE, MMMM d, yyyy')}
              </h1>
              <p className="text-muted-foreground">Archive</p>
            </div>
          </div>
          <div className="text-center py-16 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No Briefing Found</h2>
            <p>There is no briefing for {format(date, 'MMMM d, yyyy')}</p>
            <Link href="/pulse/archive" className="mt-4 inline-block">
              <Button variant="outline">Back to Archive</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Get topics count for display
  const topicsCount = await prisma.pulseTopic.count({
    where: {
      userId: user.id,
      isActive: true,
    },
  })

  return (
    <div className="min-h-screen">
      <div className="container mx-auto py-4 max-w-4xl">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/pulse/archive">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Archive
            </Button>
          </Link>
        </div>
      </div>
      <PulseBriefingView
        briefing={briefing}
        topicsCount={topicsCount}
        userName={user.firstName}
      />
    </div>
  )
}
