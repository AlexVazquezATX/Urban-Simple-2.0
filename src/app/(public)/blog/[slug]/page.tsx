import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Share2, Twitter, Linkedin } from 'lucide-react'
import { PublicNav } from '@/components/landing/public-nav'
import { ReadingProgress } from '@/components/blog/reading-progress'
import { getPostBySlug, getRecentPosts } from '@/lib/services/blog-service'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    return {
      title: 'Post Not Found',
    }
  }

  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      images: post.featuredImage ? [post.featuredImage] : [],
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.author.displayName || `${post.author.firstName} ${post.author.lastName}`],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || undefined,
      images: post.featuredImage ? [post.featuredImage] : [],
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post || post.status !== 'published') {
    notFound()
  }

  const recentPosts = await getRecentPosts(3, post.id)
  const publishDate = post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }) : ''

  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      <article className="min-h-screen bg-white pt-24 pb-20">
        <ReadingProgress />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Navigation */}
          <div className="mb-8">
            <Link
              href="/blog"
              className="flex items-center gap-2 text-charcoal-400 hover:text-charcoal-900 transition-colors text-xs font-bold uppercase tracking-widest"
            >
              <ArrowLeft size={14} /> Back to Blog
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* MAIN CONTENT COLUMN */}
            <div className="lg:col-span-8">
              {/* Article Header */}
              <div className="mb-10">
                <div className="flex gap-4 mb-6">
                  <span
                    className="text-white font-bold uppercase tracking-widest text-xs px-3 py-1.5 rounded"
                    style={{ backgroundColor: post.category?.color || '#A67C52' }}
                  >
                    {post.category?.name}
                  </span>
                  <span className="text-charcoal-400 font-bold uppercase tracking-widest text-xs py-1.5">
                    {post.readTime} min read
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif italic font-medium text-charcoal-900 mb-8 leading-[1.1]">
                  {post.title}
                </h1>
                <p className="text-xl md:text-2xl text-charcoal-500 font-light leading-relaxed border-l-4 border-bronze-200 pl-6">
                  {post.excerpt}
                </p>
              </div>

              {/* Hero Image */}
              {post.featuredImage && (
                <div className="aspect-video w-full rounded-2xl overflow-hidden mb-12 shadow-2xl relative bg-charcoal-900 group">
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]"
                  />
                </div>
              )}

              {/* Content Body */}
              <div
                className={`blog-content prose prose-lg md:prose-xl max-w-none
                            prose-headings:font-display prose-headings:italic prose-headings:font-medium prose-headings:text-charcoal-900
                            prose-h1:text-4xl md:prose-h1:text-5xl prose-h1:mt-16 prose-h1:mb-8 prose-h1:font-bold prose-h1:not-italic
                            prose-h2:text-3xl md:prose-h2:text-4xl prose-h2:mt-16 prose-h2:mb-8 prose-h2:font-semibold prose-h2:leading-tight
                            prose-h3:text-2xl md:prose-h3:text-3xl prose-h3:mt-12 prose-h3:mb-6 prose-h3:font-medium prose-h3:leading-tight
                            prose-h4:text-xl md:prose-h4:text-2xl prose-h4:mt-10 prose-h4:mb-4
                            prose-p:text-charcoal-600 prose-p:leading-[1.8] prose-p:text-lg md:prose-p:text-xl prose-p:mb-8 prose-p:font-light prose-p:tracking-wide
                            prose-a:text-bronze-600 prose-a:font-semibold prose-a:no-underline hover:prose-a:underline
                            prose-blockquote:border-l-[6px] prose-blockquote:border-bronze-500
                            prose-blockquote:bg-gradient-to-r prose-blockquote:from-bronze-50/60 prose-blockquote:to-transparent
                            prose-blockquote:px-10 prose-blockquote:py-8
                            prose-blockquote:rounded-r-3xl prose-blockquote:my-16
                            prose-blockquote:text-2xl md:prose-blockquote:text-3xl lg:prose-blockquote:text-4xl
                            prose-blockquote:font-serif prose-blockquote:italic prose-blockquote:font-medium
                            prose-blockquote:text-bronze-500 prose-blockquote:leading-snug prose-blockquote:tracking-tight
                            prose-ul:my-8 prose-ul:space-y-4 prose-ul:pl-6 prose-ul:list-disc
                            prose-ol:my-8 prose-ol:space-y-4 prose-ol:pl-6 prose-ol:list-decimal
                            prose-li:text-charcoal-600 prose-li:my-4 prose-li:leading-relaxed prose-li:text-lg md:prose-li:text-xl prose-li:font-light prose-li:pl-2
                            prose-li:marker:text-bronze-500 prose-li:marker:font-bold
                            prose-strong:text-charcoal-900 prose-strong:font-semibold prose-strong:not-italic
                            prose-em:text-charcoal-700 prose-em:italic
                            prose-img:rounded-2xl prose-img:shadow-xl prose-img:my-12 prose-img:w-full
                            prose-hr:my-12 prose-hr:border-cream-300
                            prose-code:text-bronze-700 prose-code:bg-cream-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm
                            prose-pre:bg-charcoal-900 prose-pre:text-cream-100`}
                dangerouslySetInnerHTML={{ __html: post.content }}
              />

              {/* Article Footer */}
              <div className="mt-16 pt-8 border-t border-cream-200">
                <h4 className="text-xs font-bold text-charcoal-400 uppercase tracking-widest mb-4">
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {post.keywords?.map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-cream-50 text-charcoal-500 rounded-full text-xs font-medium hover:bg-cream-100 cursor-pointer transition-colors"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* SIDEBAR COLUMN */}
            <div className="lg:col-span-4 space-y-12">
              {/* Author Widget */}
              <div className="bg-cream-50 p-8 rounded-2xl border border-cream-200 sticky top-32">
                <div className="w-16 h-16 bg-charcoal-900 rounded-full flex items-center justify-center font-serif italic font-bold text-white text-2xl mb-4">
                  U
                </div>
                <h4 className="font-semibold text-charcoal-900 text-lg">Urban Simple.</h4>
                <p className="text-charcoal-500 text-sm mb-6 mt-2">
                  Redefining commercial standards through cognitive intelligence and editorial excellence.
                </p>

                <div className="flex items-center justify-between pt-6 border-t border-cream-200">
                  <span className="text-xs font-bold text-charcoal-400 uppercase tracking-widest">
                    {publishDate}
                  </span>
                  <div className="flex gap-3">
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-charcoal-400 hover:text-bronze-600 transition-colors"
                    >
                      <Twitter size={18} />
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-charcoal-400 hover:text-bronze-600 transition-colors"
                    >
                      <Linkedin size={18} />
                    </a>
                    <button className="text-charcoal-400 hover:text-bronze-600 transition-colors">
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Read Next Widget */}
              {recentPosts.length > 0 && (
                <div>
                  <h3 className="font-serif italic text-2xl text-charcoal-900 mb-6">Read Next</h3>
                  <div className="space-y-6">
                    {recentPosts.map((relatedPost) => (
                      <Link
                        key={relatedPost.id}
                        href={`/blog/${relatedPost.slug}`}
                        className="group cursor-pointer flex gap-4 items-start"
                      >
                        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-cream-100">
                          {relatedPost.featuredImage ? (
                            <img
                              src={relatedPost.featuredImage}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              alt=""
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-bronze-300 to-bronze-500" />
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-bronze-600 uppercase tracking-widest block mb-1">
                            {relatedPost.category?.name}
                          </span>
                          <h4 className="font-semibold text-charcoal-900 text-sm leading-snug group-hover:text-bronze-600 transition-colors line-clamp-2">
                            {relatedPost.title}
                          </h4>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
