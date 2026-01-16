'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Mail } from 'lucide-react'
import { MagazineCover } from '@/components/blog/magazine-cover'
import { EditorialGrid } from '@/components/blog/editorial-grid'
import { CategoryNav } from '@/components/blog/category-nav'
import { ReadingProgress } from '@/components/blog/reading-progress'
import type { BlogPostWithRelations } from '@/lib/services/blog-service'
import type { BlogCategory } from '@prisma/client'

export function BlogFeed() {
  const [posts, setPosts] = useState<BlogPostWithRelations[]>([])
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [postsRes, categoriesRes] = await Promise.all([
        fetch('/api/blog/posts'),
        fetch('/api/blog/categories'),
      ])

      const postsData = await postsRes.json()
      const categoriesData = await categoriesRes.json()

      setPosts(postsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Failed to load blog data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get unique category names
  const categoryNames = useMemo(() => {
    return categories.map(c => c.name)
  }, [categories])

  // Filter posts by category name
  const filteredPosts = useMemo(() => {
    if (!selectedCategory) return posts
    return posts.filter((p) => p.category?.name === selectedCategory)
  }, [posts, selectedCategory])

  // Get cover story (first post)
  const coverStory = filteredPosts[0]

  // Get week number for edition header
  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const currentWeek = getWeekNumber(new Date())
  const currentYear = new Date().getFullYear()

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-12 h-12 border-4 border-bronze-200 border-t-bronze-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-charcoal-500">Loading posts...</p>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-charcoal-500">No blog posts available yet. Check back soon!</p>
      </div>
    )
  }

  return (
    <>
      <ReadingProgress />

      {/* Weekly Edition Header */}
      <motion.div
        className="bg-white border-b border-cream-200 py-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-16"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-bronze-600 font-mono text-xs uppercase tracking-widest mb-2">
                This Week&apos;s Edition
              </h2>
              <h3 className="text-2xl md:text-3xl font-display italic text-charcoal-900">
                Week {currentWeek}, {currentYear}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-charcoal-500 text-sm">
                {formatDate(new Date())}
              </p>
              <p className="text-charcoal-400 text-xs mt-1">
                {filteredPosts.length} {filteredPosts.length === 1 ? 'story' : 'stories'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Category Navigation */}
      {categoryNames.length > 0 && (
        <CategoryNav
          categories={categoryNames}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />
      )}

      {/* Cover Story */}
      {coverStory && filteredPosts.length > 0 && (
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="mb-6">
            <h2 className="text-xs font-bold text-charcoal-400 uppercase tracking-widest mb-2">
              Cover Story
            </h2>
          </div>
          <MagazineCover post={coverStory} />
        </motion.div>
      )}

      {/* Editorial Grid */}
      {filteredPosts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <div className="mb-6">
            <h2 className="text-xs font-bold text-charcoal-400 uppercase tracking-widest mb-2">
              {selectedCategory ? selectedCategory : 'All Stories'}
            </h2>
          </div>
          <EditorialGrid
            posts={filteredPosts}
            excludeId={coverStory?.id}
          />
        </motion.div>
      )}

      {/* Newsletter Signup */}
      <motion.div
        className="mt-20 mb-12"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        <div className="bg-gradient-to-br from-bronze-50 to-cream-50 rounded-3xl p-8 md:p-12 border border-bronze-200">
          <div className="max-w-2xl mx-auto text-center">
            <Mail className="w-12 h-12 text-bronze-600 mx-auto mb-4" />
            <h3 className="text-2xl md:text-3xl font-display italic text-charcoal-900 mb-3">
              Stay in the Loop
            </h3>
            <p className="text-charcoal-600 mb-6 text-lg">
              Get our weekly digest of hospitality insights, trends, and stories delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-xl border border-cream-300 bg-white focus:border-bronze-500 focus:outline-none text-charcoal-900"
              />
              <button className="px-6 py-3 bg-bronze-600 text-white rounded-xl font-semibold hover:bg-bronze-700 transition-colors">
                Subscribe
              </button>
            </div>
            <p className="text-xs text-charcoal-400 mt-4">
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </motion.div>

      {filteredPosts.length === 0 && selectedCategory && (
        <div className="text-center py-20">
          <p className="text-charcoal-500">No posts found in this category.</p>
          <button
            onClick={() => setSelectedCategory(null)}
            className="mt-4 text-bronze-600 hover:text-bronze-700 font-semibold"
          >
            View All Stories
          </button>
        </div>
      )}
    </>
  )
}
