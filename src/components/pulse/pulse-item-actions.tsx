'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { toast } from 'sonner'

interface PulseItemActionsProps {
  itemId: string
  isBookmarked: boolean
}

export function PulseItemActions({ itemId, isBookmarked: initialBookmarked }: PulseItemActionsProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked)

  const handleBookmark = async () => {
    const newState = !bookmarked
    setBookmarked(newState)

    try {
      const response = await fetch(`/api/admin/pulse/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBookmarked: newState }),
      })

      if (!response.ok) throw new Error('Failed to update bookmark')

      toast.success(newState ? 'Added to bookmarks' : 'Removed from bookmarks')
    } catch (error) {
      setBookmarked(!newState)
      toast.error('Failed to update bookmark')
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
      onClick={handleBookmark}
    >
      {bookmarked ? (
        <>
          <BookmarkCheck className="h-4 w-4 mr-2" />
          Bookmarked
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4 mr-2" />
          Bookmark
        </>
      )}
    </Button>
  )
}
