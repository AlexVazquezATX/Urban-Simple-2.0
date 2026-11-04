// Automatic follow-ups for people who asked us for a walkthrough. The instant
// auto-reply is the first email; these go out on days 2, 5 and 12 unless the
// lead replies or a person takes over.
//
// The sequence is looked up by name, not an env var. An env var is how the last
// version died: it went unset and nothing noticed. Pausing the template in
// Growth > Outreach > Sequences stops new enrollments, and the nightly health
// check says so.

export const FOLLOWUP_SEQUENCE_NAME = 'Website lead follow-ups'

// No sign-off in these bodies: the sender's signature is added at send time.
export const FOLLOWUP_STEPS = [
  {
    step: 1,
    delayDays: 2,
    subject: 'your walkthrough request',
    body: `Hi {{first_name_or_there}},

Following up on the walkthrough you asked for. It takes about 30 minutes, it's free, and we work around your service. You'll have a written quote within 48 hours.

What day works for you, and what time is quietest? Just reply here and we'll set it up.`,
  },
  {
    step: 2,
    delayDays: 3,
    subject: "what you'd see once we start",
    body: `Hi {{first_name_or_there}},

One thing worth knowing before we walk your space. Every client gets a portal with a log of each clean. You rate each visit from your phone, send us issues or requests directly, and get a weekly digest, so you never have to guess what happened overnight.

The first deep clean of every location is also free with a 3-month agreement.

If you'd still like the walkthrough, reply with a day that works.`,
  },
  {
    step: 3,
    delayDays: 7,
    subject: 'last note on your walkthrough',
    body: `Hi {{first_name_or_there}},

I haven't heard back, so this is my last note. No hard feelings if the timing is off.

If you'd still like a walkthrough, reply with a day and we'll take it from there.`,
  },
] as const

// Logged by a person, so a person has this lead. Sends are logged as 'email'
// by the executor itself, so that type can't count here.
export const HUMAN_TOUCH_TYPES = ['call', 'meeting']

/**
 * Checked right before an automatic follow-up sends to someone who came to us.
 * Their status stays 'new' while follow-ups are scheduled (see
 * automatePipelineStage), so any other status means a person moved it, by any
 * route: the lead panel, the board, a bulk edit or an agent.
 */
export function followUpStopReason(status: string, humanTouch: boolean): string | null {
  if (status !== 'new') return `status_${status}`
  if (humanTouch) return 'human_contact_logged'
  return null
}
