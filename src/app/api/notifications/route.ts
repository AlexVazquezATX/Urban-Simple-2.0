// In-app notifications for the signed-in user (the staff bell).
//   GET   → latest 30 + unread count
//   PATCH { ids: string[] } marks those read; { all: true } marks everything read.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        link: true,
        isRead: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ])

  return NextResponse.json({ notifications, unreadCount })
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const ids: string[] = Array.isArray(body.ids)
    ? body.ids.filter((x: unknown): x is string => typeof x === 'string').slice(0, 200)
    : []

  if (body.all !== true && ids.length === 0) {
    return NextResponse.json({ error: 'Pass ids or all: true' }, { status: 400 })
  }

  const result = await prisma.notification.updateMany({
    where: {
      userId: user.id,
      isRead: false,
      ...(body.all === true ? {} : { id: { in: ids } }),
    },
    data: { isRead: true, readAt: new Date() },
  })

  const unreadCount = await prisma.notification.count({ where: { userId: user.id, isRead: false } })
  return NextResponse.json({ updated: result.count, unreadCount })
}
