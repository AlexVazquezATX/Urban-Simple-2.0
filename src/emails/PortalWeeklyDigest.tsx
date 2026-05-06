// Weekly digest email for portal users — sent each Monday morning by cron.
// Renders inline-styled HTML (works in any email client). Header with the
// client's name, a thumbs-up CTA the user taps to log a satisfaction rating,
// then the week's photos and issues.

interface Photo {
  url: string
  locationName: string
  reviewDate: string
}
interface IssueLine {
  title: string
  status: string
  locationName: string
  reportedAt: string
}

export interface WeeklyDigestProps {
  recipientFirstName: string
  clientName: string
  weekRangeLabel: string
  photos: Photo[]
  issuesOpened: IssueLine[]
  issuesResolved: IssueLine[]
  visitCount: number
  rateLink: string // Pre-signed link to record satisfaction rating
  portalLink: string
  unsubscribeLink?: string
}

export function PortalWeeklyDigestHtml(props: WeeklyDigestProps): string {
  const {
    recipientFirstName,
    clientName,
    weekRangeLabel,
    photos,
    issuesOpened,
    issuesResolved,
    visitCount,
    rateLink,
    portalLink,
  } = props

  const photoGridCells: string[] = photos.slice(0, 6).map((p) => `
    <td style="padding:4px;width:33.333%;vertical-align:top;">
      <img src="${escapeHtml(p.url)}" alt="" width="180" style="display:block;width:100%;height:auto;border-radius:4px;object-fit:cover;aspect-ratio:1/1;" />
      <p style="margin:4px 0 0;font-size:11px;color:#7d7163;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${escapeHtml(p.locationName)}</p>
    </td>
  `)

  const photoRows: string[] = []
  for (let i = 0; i < photoGridCells.length; i += 3) {
    photoRows.push(`<tr>${photoGridCells.slice(i, i + 3).join('')}</tr>`)
  }

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#faf6ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f1c19;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;margin:0 auto;padding:24px 16px;">

    <tr><td>
      <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#a08c75;">Urban Simple Portal</p>
      <h1 style="margin:8px 0 4px;font-size:22px;font-weight:500;letter-spacing:-0.5px;">Your week at ${escapeHtml(clientName)}</h1>
      <p style="margin:0;font-size:13px;color:#7d7163;">${escapeHtml(weekRangeLabel)} · ${visitCount} ${visitCount === 1 ? 'visit' : 'visits'}</p>
    </td></tr>

    <tr><td style="padding-top:20px;">
      <p style="margin:0;font-size:14px;color:#1f1c19;">Hi ${escapeHtml(recipientFirstName)},</p>
      <p style="margin:8px 0 0;font-size:14px;color:#1f1c19;">Here's a quick look at what happened this week. Tap the button to let us know how we're doing.</p>
    </td></tr>

    <tr><td style="padding:16px 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center">
            <a href="${escapeHtml(rateLink)}" style="display:inline-block;background:#3a7d44;color:#ffffff;text-decoration:none;font-weight:500;padding:12px 24px;border-radius:4px;font-size:14px;">
              Rate this week →
            </a>
          </td>
        </tr>
      </table>
    </td></tr>

    ${photos.length > 0 ? `
    <tr><td>
      <p style="margin:24px 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#a08c75;">Highlights</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        ${photoRows.join('')}
      </table>
    </td></tr>
    ` : ''}

    ${issuesOpened.length > 0 || issuesResolved.length > 0 ? `
    <tr><td>
      <p style="margin:24px 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#a08c75;">Issues</p>

      ${issuesOpened.length > 0 ? `
        <p style="margin:8px 0 4px;font-size:13px;font-weight:500;color:#b45309;">${issuesOpened.length} opened this week</p>
        ${issuesOpened.map(i => `<p style="margin:0;font-size:13px;color:#1f1c19;">· ${escapeHtml(i.title)} <span style="color:#7d7163;">(${escapeHtml(i.locationName)})</span></p>`).join('')}
      ` : ''}

      ${issuesResolved.length > 0 ? `
        <p style="margin:12px 0 4px;font-size:13px;font-weight:500;color:#3a7d44;">${issuesResolved.length} resolved this week</p>
        ${issuesResolved.map(i => `<p style="margin:0;font-size:13px;color:#1f1c19;">· ${escapeHtml(i.title)} <span style="color:#7d7163;">(${escapeHtml(i.locationName)})</span></p>`).join('')}
      ` : ''}
    </td></tr>
    ` : ''}

    <tr><td style="padding-top:32px;">
      <p style="margin:0;font-size:13px;color:#7d7163;">
        See more in your portal:
        <a href="${escapeHtml(portalLink)}" style="color:#3a7d44;">${escapeHtml(portalLink)}</a>
      </p>
    </td></tr>

    <tr><td style="padding-top:24px;border-top:1px solid #e8e1d2;">
      <p style="margin:16px 0 0;font-size:11px;color:#a08c75;">
        Urban Simple LLC · Austin, TX · This is your weekly portal digest.
      </p>
    </td></tr>

  </table>
</body>
</html>`
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
