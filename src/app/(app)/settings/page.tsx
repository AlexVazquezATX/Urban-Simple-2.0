import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/page-header'
import Link from 'next/link'
import { Key, Users, MessageSquare, Sparkles, FileText } from 'lucide-react'

const settingsLinks = [
  { href: '/growth/api-keys', icon: Key, label: 'API Keys', description: 'Manage API keys for external integrations' },
  { href: '/admin/studio-clients', icon: Users, label: 'Studio Clients', description: 'Manage BackHaus studio customers' },
  { href: '/admin/feedback', icon: MessageSquare, label: 'Feedback', description: 'View user feedback and bug reports' },
  { href: '/dashboard/blog', icon: FileText, label: 'Blog', description: 'Manage blog posts and content' },
  { href: '/chat-analytics', icon: Sparkles, label: 'Chat Analytics', description: 'AI chat conversation analytics' },
]

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="ADMIN · PLATFORM"
        title="Settings"
        subtitle="Platform configuration and admin tools"
        className="mb-0"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsLinks.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}>
              <Card className="hover:border-primary/40 transition-colors h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-[10px] bg-gold-600/10 dark:bg-gold-400/12 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-gold-600 dark:text-gold-400" />
                    </div>
                    <CardTitle className="text-base">{item.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{item.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
