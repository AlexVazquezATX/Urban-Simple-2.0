'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CategoryNavProps {
  categories: string[]
  selectedCategory: string | null
  onCategorySelect: (category: string | null) => void
}

export function CategoryNav({ categories, selectedCategory, onCategorySelect }: CategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScrollability = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
  }

  useEffect(() => {
    checkScrollability()
    const scrollElement = scrollRef.current
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScrollability)
      window.addEventListener('resize', checkScrollability)
      return () => {
        scrollElement.removeEventListener('scroll', checkScrollability)
        window.removeEventListener('resize', checkScrollability)
      }
    }
  }, [categories])

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const scrollAmount = 300
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

  return (
    <div className="relative mb-12">
      {/* Scroll Buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-10 w-16 bg-gradient-to-r from-cream-50 to-transparent flex items-center justify-start pl-2 hover:from-cream-100 transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft size={20} className="text-charcoal-600" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-10 w-16 bg-gradient-to-l from-cream-50 to-transparent flex items-center justify-end pr-2 hover:from-cream-100 transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight size={20} className="text-charcoal-600" />
        </button>
      )}

      {/* Category Scroll */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 px-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <button
          onClick={() => onCategorySelect(null)}
          className={`px-6 py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
            selectedCategory === null
              ? 'bg-charcoal-900 text-white shadow-lg'
              : 'bg-white text-charcoal-600 hover:bg-cream-100 border border-cream-300'
          }`}
        >
          All Stories
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategorySelect(category)}
            className={`px-6 py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              selectedCategory === category
                ? 'bg-charcoal-900 text-white shadow-lg'
                : 'bg-white text-charcoal-600 hover:bg-cream-100 border border-cream-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  )
}
