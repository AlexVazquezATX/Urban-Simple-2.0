import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  expandContent,
  improveWriting,
  regenerateSection,
  generateTitleOptions,
  generateExcerpt,
  generateMetaDescription,
  generateBlogImage,
} from '@/lib/ai/blog-generator'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, ...params } = await request.json()

    switch (action) {
      case 'expand': {
        const { content, focusArea } = params
        const expanded = await expandContent(content, focusArea)
        return NextResponse.json({ content: expanded })
      }

      case 'improve': {
        const { content } = params
        const improved = await improveWriting(content)
        return NextResponse.json({ content: improved })
      }

      case 'regenerate_section': {
        const { fullContent, sectionToReplace, instructions } = params
        const newSection = await regenerateSection(fullContent, sectionToReplace, instructions)
        return NextResponse.json({ section: newSection })
      }

      case 'title_options': {
        const { content, currentTitle } = params
        const titles = await generateTitleOptions(content, currentTitle)
        return NextResponse.json({ titles })
      }

      case 'excerpt': {
        const { content, title } = params
        const excerpt = await generateExcerpt(content, title)
        return NextResponse.json({ excerpt })
      }

      case 'meta_description': {
        const { content, title } = params
        const metaDescription = await generateMetaDescription(content, title)
        return NextResponse.json({ metaDescription })
      }

      case 'new_image': {
        const { imagePrompt } = params
        const image = await generateBlogImage(imagePrompt)
        return NextResponse.json({ image })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error enhancing content:', error)
    return NextResponse.json(
      { error: 'Failed to enhance content' },
      { status: 500 }
    )
  }
}
