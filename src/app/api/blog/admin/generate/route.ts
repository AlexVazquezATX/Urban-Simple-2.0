import { NextResponse } from 'next/server'
import { generateBlogIdeas, generateBlogPost, generateBlogImage } from '@/lib/ai/blog-generator'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, ...params } = await request.json()

    if (action === 'ideas') {
      // Generate 4 blog post ideas
      const ideas = await generateBlogIdeas(params)
      return NextResponse.json({ ideas })
    }

    if (action === 'post') {
      // Generate full blog post from selected idea
      const { selectedIdea, ...generationParams } = params
      const post = await generateBlogPost(generationParams, selectedIdea)
      return NextResponse.json({ post })
    }

    if (action === 'image') {
      // Generate featured image
      const { imagePrompt } = params
      const image = await generateBlogImage(imagePrompt)
      return NextResponse.json({ image })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error generating blog content:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}
