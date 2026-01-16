'use client'

import { ArrowUpRight } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import type { BlogPostWithRelations } from '@/lib/services/blog-service'

interface EditorialGridProps {
  posts: BlogPostWithRelations[]
  excludeId?: string
}

export function EditorialGrid({ posts, excludeId }: EditorialGridProps) {
  const filteredPosts = excludeId ? posts.filter(p => p.id !== excludeId) : posts

  // Create asymmetric grid: first post large, rest in varying sizes
  const featuredPost = filteredPosts[0]
  const regularPosts = filteredPosts.slice(1)

  const formatDate = (date: Date | string | null) => {
    if (!date) return ''
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (filteredPosts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-charcoal-600">No posts found.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Featured Large Card */}
      {featuredPost && (
        <motion.div
          className="group cursor-pointer mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link href={`/blog/${featuredPost.slug}`}>
            <div className="grid md:grid-cols-2 gap-8 items-center bg-white rounded-2xl overflow-hidden border border-cream-200 hover:shadow-2xl transition-all duration-500">
              <div className="aspect-[4/3] md:aspect-square overflow-hidden relative">
                {featuredPost.featuredImage ? (
                  <img
                    src={featuredPost.featuredImage}
                    alt={featuredPost.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-bronze-300 to-bronze-500" />
                )}
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-charcoal-900">
                  {featuredPost.category?.name}
                </div>
              </div>
              <div className="p-8 md:p-12 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 bg-bronze-600 rounded-full"></div>
                  <span className="text-xs font-bold uppercase tracking-widest text-charcoal-400">
                    {featuredPost.readTime} min read
                  </span>
                  <span className="text-xs text-charcoal-300">•</span>
                  <span className="text-xs text-charcoal-400">
                    {formatDate(featuredPost.publishedAt)}
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-display italic font-medium text-charcoal-900 mb-4 leading-tight group-hover:text-bronze-600 transition-colors">
                  {featuredPost.title}
                </h2>
                <p className="text-charcoal-600 text-lg leading-relaxed mb-6 line-clamp-3">
                  {featuredPost.excerpt}
                </p>
                <div className="flex items-center text-charcoal-900 font-semibold group-hover:gap-2 transition-all">
                  Read Story <ArrowUpRight size={18} className="ml-1" />
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      )}

      {/* Regular Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {regularPosts.map((post, index) => {
          // Vary card sizes for visual interest
          const isLarge = index % 5 === 0 // Every 5th card is larger

          if (isLarge && index < regularPosts.length - 1) {
            return (
              <motion.div
                key={post.id}
                className="group cursor-pointer md:col-span-2 bg-white rounded-2xl overflow-hidden border border-cream-200 hover:shadow-xl transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Link href={`/blog/${post.slug}`}>
                  <div className="grid md:grid-cols-2 gap-0">
                    <div className="aspect-[4/3] overflow-hidden relative">
                      {post.featuredImage ? (
                        <img
                          src={post.featuredImage}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-bronze-300 to-bronze-500" />
                      )}
                    </div>
                    <div className="p-8 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-bronze-600">
                          {post.category?.name}
                        </span>
                        <span className="text-xs text-charcoal-300">•</span>
                        <span className="text-xs text-charcoal-400">
                          {formatDate(post.publishedAt)}
                        </span>
                      </div>
                      <h3 className="text-2xl font-display italic font-medium text-charcoal-900 mb-3 leading-tight group-hover:text-bronze-600 transition-colors">
                        {post.title}
                      </h3>
                      <p className="text-charcoal-500 text-sm leading-relaxed mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center text-sm font-semibold text-charcoal-900 group-hover:gap-2 transition-all">
                        Read <ArrowUpRight size={14} className="ml-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          }

          return (
            <motion.div
              key={post.id}
              className="group cursor-pointer bg-white rounded-2xl overflow-hidden border border-cream-200 hover:shadow-xl transition-all duration-300 flex flex-col h-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Link href={`/blog/${post.slug}`} className="flex flex-col h-full">
                <div className="aspect-[4/3] overflow-hidden relative">
                  {post.featuredImage ? (
                    <img
                      src={post.featuredImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-bronze-300 to-bronze-500" />
                  )}
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-charcoal-900">
                    {post.category?.name}
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-bronze-600 rounded-full"></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">
                        {post.readTime} min read
                      </span>
                    </div>
                    <span className="text-[10px] text-charcoal-300">
                      {formatDate(post.publishedAt)}
                    </span>
                  </div>
                  <h3 className="text-xl font-display italic font-medium text-charcoal-900 mb-3 leading-tight group-hover:text-bronze-600 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-charcoal-500 text-sm leading-relaxed mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="mt-auto flex items-center text-sm font-semibold text-charcoal-900 group-hover:gap-2 transition-all">
                    Read Story <ArrowUpRight size={14} className="ml-1" />
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
