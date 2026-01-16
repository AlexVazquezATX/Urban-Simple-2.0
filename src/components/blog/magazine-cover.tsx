'use client'

import { ArrowUpRight } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import type { BlogPostWithRelations } from '@/lib/services/blog-service'

interface MagazineCoverProps {
  post: BlogPostWithRelations
}

export function MagazineCover({ post }: MagazineCoverProps) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <motion.div
        className="group relative w-full h-[85vh] min-h-[600px] max-h-[900px] rounded-3xl overflow-hidden cursor-pointer bg-charcoal-900"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Hero Image */}
        <div className="absolute inset-0">
          {post.featuredImage ? (
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[3s] ease-out"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-bronze-400 to-bronze-600" />
          )}
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/95 via-charcoal-900/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900/40 to-transparent" />
        </div>

        {/* Content Overlay */}
        <motion.div
          className="absolute inset-0 flex flex-col justify-end p-8 md:p-12 lg:p-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <div className="max-w-4xl">
            {/* Category Badge */}
            <div className="mb-6 flex items-center gap-4">
              <span
                className="px-4 py-2 bg-white/10 backdrop-blur-md text-white text-xs font-bold uppercase tracking-widest rounded-full border border-white/20"
                style={{ backgroundColor: post.category?.color ? `${post.category.color}40` : undefined }}
              >
                {post.category?.name}
              </span>
              <span className="text-white/70 text-xs font-medium uppercase tracking-wider">
                {post.readTime} min read
              </span>
            </div>

            {/* Title */}
            <motion.h1
              className="text-4xl md:text-5xl lg:text-7xl font-display italic font-medium text-white mb-6 leading-[1.1] drop-shadow-2xl"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              {post.title}
            </motion.h1>

            {/* Excerpt */}
            <motion.p
              className="text-lg md:text-xl lg:text-2xl text-white/90 font-light leading-relaxed mb-8 max-w-3xl drop-shadow-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {post.excerpt}
            </motion.p>

            {/* CTA */}
            <motion.div
              className="flex items-center gap-3 text-white group-hover:gap-4 transition-all"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <span className="text-lg font-semibold tracking-wide">Read Cover Story</span>
              <ArrowUpRight size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </motion.div>
          </div>
        </motion.div>

        {/* Decorative Elements */}
        <motion.div
          className="absolute top-8 right-8 w-24 h-1 bg-bronze-500/50"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        />
        <motion.div
          className="absolute bottom-8 left-8 w-1 h-24 bg-bronze-500/50"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        />
      </motion.div>
    </Link>
  )
}
