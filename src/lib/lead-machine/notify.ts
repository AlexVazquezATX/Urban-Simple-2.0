// Where the machine reports: Telegram when a bot is configured, email otherwise.
// Telegram needs LEAD_MACHINE_TELEGRAM_BOT_TOKEN + LEAD_MACHINE_TELEGRAM_CHAT_ID
// (any bot works, including the one Mercury already uses).

import { prisma } from '@/lib/db'
import { renderAlertText, sendEmail, type AlertEmailContent } from '@/lib/notify/email'
import { getSettings } from './settings'

async function recipientEmail(companyId: string): Promise<string | null> {
  const settings = await getSettings(companyId)
  if (settings.notifyEmail) return settings.notifyEmail
  if (process.env.LEAD_MACHINE_NOTIFY_EMAIL) return process.env.LEAD_MACHINE_NOTIFY_EMAIL
  // The company's first super admin is the owner; agent accounts came later.
  const owner = await prisma.user.findFirst({
    where: { companyId, role: 'SUPER_ADMIN', isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { email: true },
  })
  return owner?.email ?? null
}

async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.LEAD_MACHINE_TELEGRAM_BOT_TOKEN
  const chatId = process.env.LEAD_MACHINE_TELEGRAM_CHAT_ID
  if (!token || !chatId) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true }),
    })
    if (!res.ok) console.error('[lead-machine] Telegram rejected:', res.status, await res.text().catch(() => ''))
    return res.ok
  } catch (err) {
    console.error('[lead-machine] Telegram send threw:', err)
    return false
  }
}

/** Never throws. Returns the channel used, or null when nothing went out. */
export async function sendMachineNotice(
  companyId: string,
  subject: string,
  content: AlertEmailContent,
): Promise<'telegram' | 'email' | null> {
  if (await sendTelegram(`${subject}\n\n${renderAlertText(content)}`)) return 'telegram'
  const to = await recipientEmail(companyId)
  if (to && (await sendEmail({ companyId, to, subject, content }))) return 'email'
  return null
}
