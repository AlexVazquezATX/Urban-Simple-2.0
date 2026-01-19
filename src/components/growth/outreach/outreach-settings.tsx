'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Save, Mail } from 'lucide-react'
import { toast } from 'sonner'

export function OutreachSettings() {
  const [signature, setSignature] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchUserSettings()
  }, [])

  const fetchUserSettings = async () => {
    try {
      const response = await fetch('/api/users/me')
      if (response.ok) {
        const data = await response.json()
        setSignature(data.emailSignature || '')
      }
    } catch (error) {
      console.error('Error fetching user settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailSignature: signature }),
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
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="signature">Your Signature</Label>
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

          {signature && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">Preview:</p>
              <div className="text-sm">
                <p className="text-muted-foreground italic mb-2">[Your email message here...]</p>
                <p>--</p>
                <div className="whitespace-pre-wrap">{signature}</div>
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
