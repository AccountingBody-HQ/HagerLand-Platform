import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Both addresses use accountingbody.com (verified Resend domain) since
// hagerland.com is not yet a verified sending domain on the free plan.
// Update these once HagerLand has its own verified domain.
const FROM_ADDRESS = 'HagerLand <info@accountingbody.com>'
const INTERNAL_NOTIFICATION_ADDRESS = 'info@accountingbody.com'

type SectionSubmission = {
  sectionLabel: string // e.g. "Job", "Housing listing", "Car listing"
  title: string
  submitterName?: string | null
  submitterEmail: string
  detailsHtml?: string // small HTML snippet summarising the submission (only needed for internal notification)
}

// Sends a notification to the internal team when a new listing is posted.
// Failures here are logged but never thrown — a submission should still
// succeed and save to the database even if the email fails to send.
export async function sendInternalNotification(submission: SectionSubmission) {
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: INTERNAL_NOTIFICATION_ADDRESS,
      replyTo: submission.submitterEmail,
      subject: `New ${submission.sectionLabel} submission: ${submission.title}`,
      html: `
        <h2>New ${submission.sectionLabel} submission</h2>
        <p><strong>Title:</strong> ${submission.title}</p>
        ${submission.submitterName ? `<p><strong>From:</strong> ${submission.submitterName}</p>` : ''}
        <p><strong>Email:</strong> ${submission.submitterEmail}</p>
        <hr />
        ${submission.detailsHtml}
        <hr />
        <p style="color:#666;font-size:12px;">Reply directly to this email to reach the submitter.</p>
      `,
    })
  } catch (err) {
    console.error('Failed to send internal notification email:', err)
  }
}

// Sends a polished acknowledgment to the person who submitted the listing.
// Same fail-safe behaviour: never throws, just logs.
export async function sendSubmitterAcknowledgment(submission: SectionSubmission) {
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: submission.submitterEmail,
      subject: `We've received your ${submission.sectionLabel.toLowerCase()} submission`,
      html: `
        <h2>Thanks for posting on HagerLand!</h2>
        <p>We've received your ${submission.sectionLabel.toLowerCase()} submission: <strong>${submission.title}</strong>.</p>
        <p>Our team will review it shortly before it goes live.</p>
        <p>— The HagerLand Team</p>
      `,
    })
  } catch (err) {
    console.error('Failed to send submitter acknowledgment email:', err)
  }
}
