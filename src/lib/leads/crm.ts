import type { LeadPayload } from './schema'

const CRM_ENDPOINT = 'https://www.krew42.com/api/growth/prospects'

export async function postLeadToCrm(payload: LeadPayload): Promise<void> {
  const apiKey = process.env.US_CRM_API_KEY
  if (!apiKey) {
    console.error('[leads/crm] US_CRM_API_KEY is not set; skipping CRM post')
    return
  }

  try {
    const res = await fetch(CRM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[leads/crm] CRM post failed', {
        status: res.status,
        body: text,
      })
    }
  } catch (err) {
    console.error('[leads/crm] CRM post threw', err)
  }
}
