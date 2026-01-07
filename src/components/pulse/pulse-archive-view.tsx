'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns'
import { motion } from 'framer-motion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BookmarkCheck,
  ExternalLink,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PulseBriefingItem, PulseTopic } from '@prisma/client'

interface BriefingSummary {
  id: string
  date: Date
  title: string | null
  status: string
  readAt: Date | null
  _count: {
    items: number
  }
}

interface BookmarkedItem extends PulseBriefingItem {
  topic: Pick<PulseTopic, 'id' | 'name' | 'category'> | null
  briefing: {
    date: Date
  }
}

interface PulseArchiveViewProps {
  briefings: BriefingSummary[]
  bookmarkedItems: BookmarkedItem[]
}

export function PulseArchiveView({ briefings, bookmarkedItems }: PulseArchiveViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Create a map of dates to briefings for quick lookup
  const briefingsByDate = new Map(
    briefings.map((b) => [format(new Date(b.date), 'yyyy-MM-dd'), b])
  )

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Add padding days for calendar alignment
  const startDay = monthStart.getDay()
  const paddingDays = Array(startDay).fill(null)

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const selectedBriefing = selectedDate
    ? briefingsByDate.get(format(selectedDate, 'yyyy-MM-dd'))
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/pulse">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Briefing Archive</h1>
          <p className="text-muted-foreground">
            Browse past briefings and bookmarked items
          </p>
        </div>
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="bookmarks" className="gap-2">
            <BookmarkCheck className="h-4 w-4" />
            Bookmarks ({bookmarkedItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Calendar */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {format(currentMonth, 'MMMM yyyy')}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={previousMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={nextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-medium text-muted-foreground py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Padding days */}
                  {paddingDays.map((_, index) => (
                    <div key={`pad-${index}`} className="aspect-square" />
                  ))}

                  {/* Actual days */}
                  {days.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd')
                    const hasBriefing = briefingsByDate.has(dateKey)
                    const isSelected = selectedDate && isSameDay(day, selectedDate)
                    const isCurrentDay = isToday(day)

                    return (
                      <button
                        key={dateKey}
                        onClick={() => setSelectedDate(day)}
                        disabled={!hasBriefing && !isCurrentDay}
                        className={cn(
                          'aspect-square rounded-lg flex items-center justify-center text-sm relative transition-colors',
                          hasBriefing && 'bg-primary/10 hover:bg-primary/20 font-medium',
                          isSelected && 'ring-2 ring-primary',
                          isCurrentDay && 'ring-2 ring-primary/50',
                          !hasBriefing && !isCurrentDay && 'text-muted-foreground/50'
                        )}
                      >
                        {format(day, 'd')}
                        {hasBriefing && (
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Selected Day Detail */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedDate
                    ? format(selectedDate, 'EEEE, MMMM d, yyyy')
                    : 'Select a date'}
                </CardTitle>
                <CardDescription>
                  {selectedBriefing
                    ? `${selectedBriefing._count.items} items`
                    : selectedDate
                    ? 'No briefing for this date'
                    : 'Click on a date to view details'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedBriefing ? (
                  <div className="space-y-4">
                    {selectedBriefing.title && (
                      <div>
                        <h3 className="font-semibold">{selectedBriefing.title}</h3>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      {selectedBriefing._count.items} items
                      {selectedBriefing.readAt && (
                        <Badge variant="secondary" className="ml-2">
                          Read
                        </Badge>
                      )}
                    </div>
                    <Link
                      href={`/pulse/archive/${format(new Date(selectedBriefing.date), 'yyyy-MM-dd')}`}
                    >
                      <Button className="w-full">
                        View Briefing
                      </Button>
                    </Link>
                  </div>
                ) : selectedDate ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No briefing was generated for this date</p>
                    {isToday(selectedDate) && (
                      <Link href="/pulse" className="mt-4 inline-block">
                        <Button variant="outline" size="sm">
                          Generate Today's Briefing
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a highlighted date to view its briefing</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Briefings List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Briefings</CardTitle>
            </CardHeader>
            <CardContent>
              {briefings.length > 0 ? (
                <div className="space-y-2">
                  {briefings.slice(0, 10).map((briefing) => (
                    <Link
                      key={briefing.id}
                      href={`/pulse/archive/${format(new Date(briefing.date), 'yyyy-MM-dd')}`}
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium">
                            {format(new Date(briefing.date), 'MMM d, yyyy')}
                          </div>
                          {briefing.title && (
                            <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {briefing.title}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{briefing._count.items} items</Badge>
                          {!briefing.readAt && (
                            <Badge variant="secondary">New</Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No briefings yet. Generate your first one!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookmarks">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bookmarked Items</CardTitle>
              <CardDescription>
                Items you've saved for later reference
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bookmarkedItems.length > 0 ? (
                <div className="space-y-4">
                  {bookmarkedItems.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {item.topic && (
                              <Badge variant="outline" className="text-xs">
                                {item.topic.name}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(item.briefing.date), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <h3 className="font-semibold">{item.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {item.summary}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {item.sourceUrl && (
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="icon">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                          <BookmarkCheck className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BookmarkCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bookmarked items yet</p>
                  <p className="text-sm mt-1">
                    Bookmark items in your daily briefings to save them here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
