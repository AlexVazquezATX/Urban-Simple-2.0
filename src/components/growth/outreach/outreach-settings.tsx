'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Save, Mail, Upload, X, Image as ImageIcon } from 'lucide-react'
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
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5" />
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
            <p className="text-xs text-muted-foreground mb-3">
              Add your company logo to appear at the bottom of your signature
            </p>
            {logoUrl ? (
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-auto border rounded-lg overflow-hidden bg-white p-2">
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
                  <X className="h-4 w-4 mr-2" />
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
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </>
                  )}
                </Button>
                <span className="text-xs text-muted-foreground">
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
              className="font-mono text-sm mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Plain text only. Line breaks will be preserved. A separator line (--) will be added automatically before your signature.
            </p>
          </div>

          {/* Preview */}
          {(signature || logoUrl) && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">Preview:</p>
              <div className="text-sm bg-white p-4 rounded border">
                <p className="text-muted-foreground italic mb-4">[Your email message here...]</p>
                <p className="text-muted-foreground mb-2">--</p>
                {signature && <div className="whitespace-pre-wrap mb-3">{signature}</div>}
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

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
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
