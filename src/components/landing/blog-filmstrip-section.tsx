'use client'

import { useEffect, useState } from 'react'
import { BlogFilmstripClient } from './blog-filmstrip-client'

interface BlogPost {
  slug: string
  title: string
  excerpt: string | null
  featuredImage: string | null
  publishedAt: string | null
  readTime: number | null
  category: { name: string; color: string | null } | null
}

export function BlogFilmstripSection() {
  const [posts, setPosts] = useState<BlogPost[]>([])

  useEffect(() => {
    fetch('/api/blog/posts?limit=4')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPosts(
            data.map((post: Record<string, unknown>) => ({
              slug: post.slug as string,
              title: post.title as string,
              excerpt: (post.excerpt as string) || null,
              featuredImage: (post.featuredImage as string) || null,
              publishedAt: (post.publishedAt as string) || null,
              readTime: (post.readTime as number) || null,
              category: post.category
                ? {
                    name: (post.category as Record<string, unknown>).name as string,
                    color: ((post.category as Record<string, unknown>).color as string) || null,
                  }
                : null,
            }))
          )
        }
      })
      .catch(() => {
        // Silently fail — section won't render
      })
  }, [])

  if (posts.length === 0) return null

  return <BlogFilmstripClient posts={posts} />
}
