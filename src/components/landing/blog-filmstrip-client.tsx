'use client'

import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { ArrowRight, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fadeInUp, staggerContainer } from './landing-animations'

interface BlogPost {
  slug: string
  title: string
  excerpt: string | null
  featuredImage: string | null
  publishedAt: string | null
  readTime: number | null
  category: { name: string; color: string | null } | null
}

export function BlogFilmstripClient({ posts }: { posts: BlogPost[] }) {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="py-16 lg:py-20 bg-cream-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12"
        >
          <motion.div variants={fadeInUp}>
            <Badge variant="secondary" className="mb-4 bg-bronze-100 text-bronze-700 border-bronze-200">
              From Our Blog
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-charcoal-900 leading-tight tracking-tight">
              Latest insights
            </h2>
          </motion.div>
          <motion.div variants={fadeInUp}>
            <Link href="/blog">
              <Button variant="outline" className="border-charcoal-300 text-charcoal-700 hover:bg-charcoal-50">
                View All Posts
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Filmstrip Grid */}
        <motion.div
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {posts.map((post, index) => (
            <motion.div key={post.slug} variants={fadeInUp}>
              <Link
                href={`/blog/${post.slug}`}
                className="group block h-full"
              >
                <article className="h-full bg-white rounded-2xl border border-cream-200 overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300">
                  {/* Image */}
                  <div className="aspect-[16/10] relative overflow-hidden">
                    {post.featuredImage ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-ocean-100 to-bronze-100" />
                    )}
                    {post.category && (
                      <div className="absolute top-3 left-3">
                        <span
                          className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold text-white backdrop-blur-sm"
                          style={{ backgroundColor: post.category.color || '#4B6A8A' }}
                        >
                          {post.category.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-center gap-3 text-xs text-charcoal-500 mb-3">
                      {post.publishedAt && (
                        <time dateTime={post.publishedAt}>
                          {new Date(post.publishedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </time>
                      )}
                      {post.readTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {post.readTime} min
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-charcoal-900 group-hover:text-ocean-700 transition-colors leading-snug line-clamp-2 mb-2">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-sm text-charcoal-600 line-clamp-2 leading-relaxed">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                </article>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
