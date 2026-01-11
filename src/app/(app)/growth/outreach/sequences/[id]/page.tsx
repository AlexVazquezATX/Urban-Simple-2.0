'use client'

import { SequenceBuilder } from '@/components/growth/outreach/sequence-builder'
import { use } from 'react'

export default function EditSequencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <SequenceBuilder sequenceId={id} />
}
