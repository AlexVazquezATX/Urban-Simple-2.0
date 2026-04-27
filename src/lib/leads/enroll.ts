/**
 * Enroll a freshly-created prospect into the walkthrough hot-leads
 * outreach sequence. Configuration:
 *
 *   WALKTHROUGH_OUTREACH_SEQUENCE_ID  — the sequence to drop leads into
 *   CRM_BASE_URL                      — defaults to https://www.urbansimple.net
 *   US_CRM_API_KEY                    — same key used for the prospects POST
 *
 * Failures are logged and swallowed. We never block the form submission
 * on enrollment — emails and the prospect record both already exist by
 * the time we get here.
 */
const CRM_BASE_URL = process.env.CRM_BASE_URL || 'https://www.urbansimple.net'

export async function enrollLeadInSequence(prospectId: string): Promise<void> {
  const sequenceId = process.env.WALKTHROUGH_OUTREACH_SEQUENCE_ID
  if (!sequenceId) {
    console.warn(
      '[leads/enroll] WALKTHROUGH_OUTREACH_SEQUENCE_ID not set; skipping enrollment',
    )
    return
  }

  const apiKey = process.env.US_CRM_API_KEY
  if (!apiKey) {
    console.warn('[leads/enroll] US_CRM_API_KEY not set; skipping enrollment')
    return
  }

  const url = `${CRM_BASE_URL}/api/growth/outreach/sequences/${sequenceId}/apply`

  console.log('[leads/enroll] start', { sequenceId, prospectId })

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ prospectIds: [prospectId] }),
    })

    const text = await res.text().catch(() => '')

    if (!res.ok) {
      console.error('[leads/enroll] enrollment failed', {
        status: res.status,
        body: text.slice(0, 500),
      })
      return
    }

    console.log('[leads/enroll] enrollment ok', {
      prospectId,
      bodyPreview: text.slice(0, 200),
    })
  } catch (err) {
    console.error('[leads/enroll] enrollment threw', err)
  }
}
