'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Trash2, Loader2 } from 'lucide-react'

export function DeleteDocumentButton({
  docId,
  docName,
  endpoint,
}: {
  docId: string
  docName: string
  endpoint: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${docName}"? This can't be undone.`)) return
    setLoading(true)
    try {
      const res = await fetch(endpoint, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Document deleted')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      title={`Delete ${docName}`}
      className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-coral-600/10 hover:text-coral-600 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
    </button>
  )
}
