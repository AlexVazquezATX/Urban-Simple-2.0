'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Save, Mail, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

export function OutreachSettings() {
  const [signature, setSignature] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchUserSettings()
  }, [])

  const fetchUserSettings = async () => {
    try {
      const response = await fetch('/api/users/me')
      if (response.ok) {
        const data = await response.json()
        setSignature(data.emailSignature || '')
        setLogoUrl(data.signatureLogoUrl || null)
      }
    } catch (error) {
      console.error('Error fetching user settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, and WebP are allowed.')
      return
    }

    const maxSize = 2 * 1024 * 1024 // 2MB for logos
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 2MB.')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'signatures')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const data = await response.json()
      setLogoUrl(data.url)
      toast.success('Logo uploaded!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload logo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveLogo = () => {
    setLogoUrl(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailSignature: signature,
          signatureLogoUrl: logoUrl,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      toast.success('Email signature saved!')
    } catch (error) {
      console.error('Error saving signature:', error)
      toast.error('Failed to save signature')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-[10px] bg-gold-600/10 dark:bg-gold-400/12">
              <Mail className="size-[18px] text-gold-600 dark:text-gold-400" />
            </div>
            <div>
              <CardTitle>Email Signature</CardTitle>
              <CardDescription>
                This signature will be automatically appended to all outreach emails you send
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div>
            <Label>Signature Logo (Optional)</Label>
            <p className="mb-3 mt-0.5 text-[11px] text-muted-foreground">
              Add your company logo to appear at the bottom of your signature
            </p>
            {logoUrl ? (
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-auto overflow-hidden rounded-[10px] border border-border bg-background p-2">
                  <img
                    src={logoUrl}
                    alt="Signature logo"
                    className="h-full w-auto object-contain"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveLogo}
                >
                  <X className="size-3.5" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="size-3.5" />
                      Upload Logo
                    </>
                  )}
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  PNG, JPG, or WebP (max 2MB, recommended: 200px height)
                </span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>

          {/* Signature Text */}
          <div>
            <Label htmlFor="signature">Signature Text</Label>
            <Textarea
              id="signature"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              rows={8}
              placeholder={`Best regards,

John Smith
Business Development
Urban Simple
(512) 555-0123
john@urbansimple.net`}
              className="mt-1 font-mono text-sm"
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Plain text only. Line breaks will be preserved. A separator line (--) will be added automatically before your signature.
            </p>
          </div>

          {/* Preview */}
          {(signature || logoUrl) && (
            <div className="rounded-[12px] border border-border bg-secondary/50 p-3">
              <p className="kicker mb-2 text-muted-foreground">Preview</p>
              <div className="rounded-[10px] border border-border bg-background p-3 text-sm">
                <p className="mb-4 text-xs italic text-muted-foreground">[Your email message here...]</p>
                <p className="mb-2 text-muted-foreground">--</p>
                {signature && <div className="mb-3 whitespace-pre-wrap text-sm text-foreground">{signature}</div>}
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt="Signature logo"
                    className="h-12 w-auto"
                  />
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end border-t border-border pt-4">
            <Button onClick={handleSave} disabled={saving} variant="gold">
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  Save Signature
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
