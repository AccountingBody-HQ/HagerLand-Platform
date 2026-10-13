import 'server-only'
import { brand } from '@/lib/brand'
import { formatETBCents, formatDate } from '@/lib/format'
import { canonicalUrl } from '@/lib/site'
import { renderEmail, type RenderedEmail } from './layout'

const LISTER_REASON = 'You are receiving this because you have a listing or business profile on HagerLand.'

export function listingSubmittedEmail(p: { name: string; title: string }): RenderedEmail {
  return renderEmail({
    subject: `We've received your listing: ${p.title}`,
    preheader: 'We review every listing before it goes live, usually within 1 business day.',
    heading: 'Your listing is with our review team',
    paragraphs: [`Hello ${p.name},`, `Thanks for listing "${p.title}". We review every listing before it goes live, usually within one business day. We'll email you as soon as it's approved.`],
    button: { label: 'View my listings', href: canonicalUrl('/account/listings') },
    reason: LISTER_REASON,
  })
}

export function listingApprovedEmail(p: { name: string; title: string; url: string; expiresAt: string | null }): RenderedEmail {
  return renderEmail({
    subject: `Your listing is live: ${p.title}`,
    preheader: 'Your property is now visible on HagerLand.',
    heading: 'Your listing is live',
    paragraphs: [
      `Hello ${p.name},`,
      `"${p.title}" is now live on HagerLand.`,
      p.expiresAt ? `To keep listings current, it will stay live until ${formatDate(p.expiresAt)}. We'll remind you a week before so you can renew it in one click.` : '',
    ].filter(Boolean),
    button: { label: 'See your listing', href: p.url },
    reason: LISTER_REASON,
  })
}

export function listingRejectedEmail(p: { name: string; title: string; reason: string }): RenderedEmail {
  return renderEmail({
    subject: `Changes needed: ${p.title}`,
    preheader: 'Your listing needs a few changes before it can go live.',
    heading: 'Your listing needs some changes',
    paragraphs: [`Hello ${p.name},`, `We couldn't publish "${p.title}" yet. Here's what needs to change:`],
    quote: p.reason,
    button: { label: 'Edit and resubmit', href: canonicalUrl('/account/listings') },
    reason: LISTER_REASON,
  })
}

export function listingExpiringEmail(p: { name: string; title: string; expiresAt: string }): RenderedEmail {
  return renderEmail({
    subject: `Renew your listing: ${p.title}`,
    preheader: `Your listing expires on ${formatDate(p.expiresAt)}.`,
    heading: 'Your listing expires in 7 days',
    paragraphs: [`Hello ${p.name},`, `"${p.title}" will be taken down on ${formatDate(p.expiresAt)}. If it's still available, renew it in one click to keep it live for another 60 days. If it's sold or let, you can archive it.`],
    button: { label: 'Renew or update', href: canonicalUrl('/account/listings') },
    reason: LISTER_REASON,
  })
}

export function listingExpiredEmail(p: { name: string; title: string }): RenderedEmail {
  return renderEmail({
    subject: `Your listing has expired: ${p.title}`,
    preheader: 'Renew within 30 days to restore it.',
    heading: 'Your listing has expired',
    paragraphs: [`Hello ${p.name},`, `"${p.title}" is no longer shown on HagerLand. If it's still available, renew it within 30 days and it goes straight back up.`],
    button: { label: 'Renew my listing', href: canonicalUrl('/account/listings') },
    reason: LISTER_REASON,
  })
}

export function newEnquiryEmail(p: {
  reference: string
  subjectLine: string
  targetLabel: string
  targetUrl: string | null
  name: string
  phone: string
  email: string | null
  preferredContact: string | null
  intentLabel: string
  message: string
}): RenderedEmail {
  return renderEmail({
    subject: `New enquiry: ${p.subjectLine}`,
    preheader: `${p.name} sent an enquiry about ${p.targetLabel}.`,
    heading: 'You have a new enquiry',
    paragraphs: [`${p.name} sent an enquiry about ${p.targetLabel}. Reply quickly: fast replies win more business.`],
    details: [
      ['Reference', p.reference],
      ['Enquiry', p.intentLabel],
      ['Name', p.name],
      ['Phone', p.phone],
      ...(p.email ? ([['Email', p.email]] as [string, string][]) : []),
      ...(p.preferredContact ? ([['Prefers', p.preferredContact]] as [string, string][]) : []),
      ...(p.targetUrl ? ([['Listing', p.targetUrl]] as [string, string][]) : []),
    ],
    quote: p.message,
    button: { label: 'View in your dashboard', href: canonicalUrl('/account/enquiries') },
    reason: LISTER_REASON,
  })
}

export function enquiryConfirmationEmail(p: { name: string; reference: string; targetLabel: string; recipientLabel: string; message: string }): RenderedEmail {
  return renderEmail({
    subject: `Your enquiry has been sent (${p.reference})`,
    preheader: `We've passed your message to ${p.recipientLabel}.`,
    heading: 'Your enquiry has been sent',
    paragraphs: [
      `Hello ${p.name},`,
      `We've passed your message about ${p.targetLabel} to ${p.recipientLabel}. They'll contact you directly.`,
      'Stay safe: never pay a deposit before viewing a property and checking the ownership documents.',
    ],
    details: [['Reference', p.reference]],
    quote: p.message,
    reason: 'You are receiving this because you sent an enquiry on HagerLand.',
  })
}

export function registerInterestConfirmationEmail(p: { name: string; reference: string; projectName: string | null }): RenderedEmail {
  return renderEmail({
    subject: `Thanks for registering your interest (${p.reference})`,
    preheader: `${brand.divisions.developments} will be in touch.`,
    heading: 'Thanks for registering your interest',
    paragraphs: [
      `Hello ${p.name},`,
      p.projectName
        ? `We've noted your interest in ${p.projectName}. Our sales team will contact you with plans, prices and next steps.`
        : `We've noted your interest in ${brand.divisions.developments}. You'll hear from us first about locations, plans and prices.`,
    ],
    details: [['Reference', p.reference]],
    button: { label: `About ${brand.divisions.developments}`, href: canonicalUrl('/our-developments') },
    reason: 'You are receiving this because you registered your interest on HagerLand.',
  })
}

export function quoteReceivedEmail(p: { name: string; reference: string; itemCount: number; hasFiles: boolean; responseTarget: string }): RenderedEmail {
  return renderEmail({
    subject: `We've received your quote request (${p.reference})`,
    preheader: 'HagerLand Supply will reply with a clear price and delivery.',
    heading: 'Your quote request is with HagerLand Supply',
    paragraphs: [
      `Hello ${p.name},`,
      `Thanks for your request${p.itemCount ? ` for ${p.itemCount} item${p.itemCount === 1 ? '' : 's'}` : ''}${p.hasFiles ? ' and your materials list' : ''}. Our team will reply with a clear price and delivery details${p.responseTarget ? ` ${p.responseTarget}` : ' as soon as possible'}.`,
    ],
    details: [['Reference', p.reference]],
    reason: 'You are receiving this because you requested a quote from HagerLand Supply.',
  })
}

export function quoteInternalEmail(p: { reference: string; name: string; phone: string; email: string | null; source: string; lines: string[]; notes: string | null; adminUrl: string }): RenderedEmail {
  return renderEmail({
    subject: `New quote request ${p.reference} from ${p.name}`,
    preheader: `${p.lines.length} item(s) · ${p.source}`,
    heading: 'New quote request',
    paragraphs: [`Source: ${p.source}`],
    details: [['Reference', p.reference], ['Name', p.name], ['Phone', p.phone], ...(p.email ? ([['Email', p.email]] as [string, string][]) : []), ...p.lines.map((l, i) => [`Item ${i + 1}`, l] as [string, string])],
    quote: p.notes ?? undefined,
    button: { label: 'Open in admin', href: p.adminUrl },
    reason: 'Internal notification for the HagerLand Supply team.',
  })
}

export function quoteIssuedEmail(p: { name: string; reference: string; totalCents: number | null; hasDocument: boolean; validDays: number }): RenderedEmail {
  return renderEmail({
    subject: `Your quote is ready (${p.reference})`,
    preheader: 'Your HagerLand Supply quote is ready.',
    heading: 'Your quote is ready',
    paragraphs: [
      `Hello ${p.name},`,
      p.totalCents !== null ? `Your quote total is ${formatETBCents(p.totalCents)}.` : 'Your quote is ready.',
      p.hasDocument ? 'You can view the full quote from your account, or reply to this email for a copy.' : '',
      `Prices are valid for ${p.validDays} days unless stated otherwise. Reply to this email or call us to confirm your order and delivery.`,
    ].filter(Boolean),
    details: [['Reference', p.reference]],
    button: { label: 'View my quotes', href: canonicalUrl('/account/quotes') },
    reason: 'You are receiving this because you requested a quote from HagerLand Supply.',
  })
}

export function claimDecisionEmail(p: { name: string; orgName: string; approved: boolean; note?: string | null }): RenderedEmail {
  return renderEmail({
    subject: p.approved ? `You now manage ${p.orgName} on HagerLand` : `Your claim for ${p.orgName}`,
    preheader: p.approved ? 'Your claim was approved.' : 'We could not approve your claim.',
    heading: p.approved ? 'Your claim was approved' : "We couldn't approve your claim",
    paragraphs: p.approved
      ? [`Hello ${p.name},`, `You can now edit ${p.orgName}'s profile, add your portfolio and receive enquiries. Submit your trade licence to get the Verified badge.`]
      : [`Hello ${p.name},`, `We couldn't confirm that you represent ${p.orgName}. If you think this is a mistake, reply with evidence such as a trade licence photo.`],
    quote: p.note ?? undefined,
    button: p.approved ? { label: 'Manage your profile', href: canonicalUrl('/account/company') } : undefined,
    reason: LISTER_REASON,
  })
}

export function claimSubmittedEmail(p: { name: string; orgName: string }): RenderedEmail {
  return renderEmail({
    subject: `We've received your claim for ${p.orgName}`,
    preheader: 'We review claims within 1–2 business days.',
    heading: 'Your claim is being reviewed',
    paragraphs: [`Hello ${p.name},`, `Thanks for claiming ${p.orgName}. We check every claim to protect businesses from impersonation. We'll email you when it's decided.`],
    reason: LISTER_REASON,
  })
}

export function verificationDecisionEmail(p: { name: string; orgName: string; approved: boolean; note?: string | null }): RenderedEmail {
  return renderEmail({
    subject: p.approved ? `${p.orgName} is now Verified on HagerLand` : `Verification for ${p.orgName}`,
    preheader: p.approved ? 'Your Verified badge is live.' : 'We need more information.',
    heading: p.approved ? 'You are now Verified' : 'We need a little more to verify you',
    paragraphs: p.approved
      ? [`Hello ${p.name},`, `We've checked your documents. ${p.orgName} now shows the gold Verified badge.`]
      : [`Hello ${p.name},`, `We couldn't complete verification for ${p.orgName} yet.`],
    quote: p.note ?? undefined,
    button: { label: 'Open your company profile', href: canonicalUrl('/account/company') },
    reason: LISTER_REASON,
  })
}

export function orgDecisionEmail(p: { name: string; orgName: string; approved: boolean; reason?: string | null; url: string }): RenderedEmail {
  return renderEmail({
    subject: p.approved ? `${p.orgName} is live on HagerLand` : `Changes needed: ${p.orgName}`,
    preheader: p.approved ? 'Your business profile is now public.' : 'Your profile needs changes before it goes live.',
    heading: p.approved ? 'Your business profile is live' : 'Your profile needs some changes',
    paragraphs: p.approved
      ? [`Hello ${p.name},`, `${p.orgName} is now listed on HagerLand. Add a logo and portfolio to stand out, and submit your trade licence to get Verified.`]
      : [`Hello ${p.name},`, `We couldn't publish ${p.orgName} yet.`],
    quote: p.reason ?? undefined,
    button: { label: p.approved ? 'See your profile' : 'Edit your profile', href: p.approved ? p.url : canonicalUrl('/account/company') },
    reason: LISTER_REASON,
  })
}

export function adminDigestEmail(p: { lines: [string, string][]; adminUrl: string }): RenderedEmail {
  return renderEmail({
    subject: `HagerLand daily digest · ${formatDate(new Date())}`,
    preheader: 'Pending reviews, new leads and anything that needs attention.',
    heading: 'Daily digest',
    paragraphs: ['Here is what needs attention today.'],
    details: p.lines,
    button: { label: 'Open admin', href: p.adminUrl },
    reason: 'Internal daily digest for HagerLand administrators.',
  })
}

export function adminNoticeEmail(p: { subject: string; heading: string; lines: [string, string][]; adminUrl: string }): RenderedEmail {
  return renderEmail({
    subject: p.subject,
    preheader: p.heading,
    heading: p.heading,
    paragraphs: [],
    details: p.lines,
    button: { label: 'Open admin', href: p.adminUrl },
    reason: 'Internal notification for HagerLand administrators.',
  })
}

export function contactMessageEmail(p: { name: string; phone: string; email: string | null; topic: string; message: string; reference: string }): RenderedEmail {
  return renderEmail({
    subject: `Website message ${p.reference}: ${p.topic}`,
    preheader: `From ${p.name}`,
    heading: 'New message from the contact form',
    paragraphs: [],
    details: [['Reference', p.reference], ['Topic', p.topic], ['Name', p.name], ['Phone', p.phone], ...(p.email ? ([['Email', p.email]] as [string, string][]) : [])],
    quote: p.message,
    reason: 'Internal notification for the HagerLand team.',
  })
}

export function accountDeletedEmail(p: { name: string }): RenderedEmail {
  return renderEmail({
    subject: 'Your HagerLand account has been deleted',
    preheader: 'We have deleted your account as you asked.',
    heading: 'Your account has been deleted',
    paragraphs: [
      `Hello ${p.name},`,
      'As you asked, we have deleted your HagerLand account and your profile. Listings you posted as a private owner have been taken down.',
      'Enquiries you sent to others may still be kept by the people who received them. If you have any questions, reply to this email.',
    ],
    reason: 'You are receiving this because you asked us to delete your HagerLand account.',
  })
}
