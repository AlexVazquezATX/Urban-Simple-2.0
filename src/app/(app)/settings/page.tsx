import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import { Bot, Key, Users, MessageSquare, Sparkles, FileText } from 'lucide-react'

const settingsLinks = [
  { href: '/growth/agent', icon: Bot, label: 'Growth Agent', description: 'Configure autonomous lead generation pipeline' },
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
      <div className="space-y-1">
        <h1 className="text-4xl font-medium tracking-tight font-display text-warm-900 dark:text-cream-100">
          Settings
        </h1>
        <p className="text-lg text-warm-500 dark:text-cream-400">
          Platform configuration and admin tools
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsLinks.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.href} href={item.href}>
              <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900 hover:border-ocean-400 transition-colors h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-sm bg-warm-100 dark:bg-charcoal-800 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-lime-600 dark:text-lime-400" />
                    </div>
                    <CardTitle className="text-warm-900 dark:text-cream-100 text-base font-medium">{item.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-warm-500 dark:text-cream-400">{item.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
