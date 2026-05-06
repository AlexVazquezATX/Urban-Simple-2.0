'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PORTAL_DOC_CATEGORIES } from '@/lib/portal-documents'

// Reusable upload dialog. The endpoint differs between portal and admin
// contexts so the parent passes it in. Refreshes the page on success.
export function UploadDocumentButton({ endpoint, label = 'Upload' }: { endpoint: string; label?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('coi')
  const [description, setDescription] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [uploading, setUploading] = useState(false)

  const reset = () => {
    setFile(null)
    setName('')
    setCategory('coi')
    setDescription('')
    setExpiresAt('')
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    // Auto-fill name from filename if blank.
    if (f && !name) setName(f.name.replace(/\.[^.]+$/, ''))
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Pick a file first')
      return
    }
    if (!name.trim()) {
      toast.error('Add a name for this document')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', name.trim())
      fd.append('category', category)
      if (description.trim()) fd.append('description', description.trim())
      if (expiresAt) fd.append('expiresAt', expiresAt)

      const res = await fetch(endpoint, { method: 'POST', body: fd })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Upload failed')
      toast.success('Document uploaded')
      reset()
      setOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); setOpen(next) }}>
      <DialogTrigger asChild>
        <Button variant="lime" className="rounded-sm">
          <Upload className="mr-1.5 h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>
            PDFs, scans, training rosters, COIs. Expiration date helps us flag stale docs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="doc-file">File</Label>
            <Input
              id="doc-file"
              type="file"
              onChange={handleFile}
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx,.xls,.xlsx,.csv,.txt"
            />
            {file && (
              <p className="text-[10px] text-warm-500">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-name">Name *</Label>
            <Input
              id="doc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Workers Comp Insurance Cert"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="doc-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="doc-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PORTAL_DOC_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-expires">Expires (optional)</Label>
              <Input
                id="doc-expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-desc">Notes (optional)</Label>
            <Textarea
              id="doc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything we should know about this doc"
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={uploading} className="rounded-sm">
            Cancel
          </Button>
          <Button type="button" onClick={handleUpload} disabled={uploading || !file} className="rounded-sm">
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
