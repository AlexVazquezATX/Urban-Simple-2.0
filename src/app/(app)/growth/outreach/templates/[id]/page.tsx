'use client'

import { TemplateEditor } from '@/components/growth/outreach/template-editor'
import { use } from 'react'

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <TemplateEditor templateId={id} />
}
