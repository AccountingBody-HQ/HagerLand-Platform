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

export function interestConfirmationEmail(p: { name: string; reference: string; verticalName: string; href: string; live: boolean }): RenderedEmail {
  return renderEmail({
    subject: `Thanks for registering your interest (${p.reference})`,
    preheader: p.live ? `${p.verticalName} on HagerLand.` : `We'll tell you when ${p.verticalName} opens on HagerLand.`,
    heading: 'Thanks for registering your interest',
    paragraphs: [
      `Hello ${p.name},`,
      p.live
        ? `We've noted your interest in ${p.verticalName}. Our team will be in touch.`
        : `We've noted your interest in ${p.verticalName}. It isn't open yet: we'll email you when it is, and only about this unless you asked for other news.`,
    ],
    details: [['Reference', p.reference]],
    button: { label: `About ${p.verticalName}`, href: p.href },
    reason: 'You are receiving this because you registered your interest on HagerLand.',
  })
}

export function partnerApplicationEmail(p: { name: string; organisation: string; reference: string; verticalName: string }): RenderedEmail {
  return renderEmail({
    subject: `We've received your partner application (${p.reference})`,
    preheader: `Thanks for your interest in partnering with HagerLand on ${p.verticalName}.`,
    heading: 'Thanks for your partner application',
    paragraphs: [
      `Hello ${p.name},`,
      `We've received ${p.organisation}'s application to partner with HagerLand on ${p.verticalName}. We'll review it and contact you to discuss next steps, including the licences and approvals that apply.`,
    ],
    details: [['Reference', p.reference]],
    reason: 'You are receiving this because you applied to become a HagerLand partner.',
  })
}

const REQUESTER_REASON = 'You are receiving this because you requested a service on HagerLand.'
const PROVIDER_REASON = 'You are receiving this because your business is listed on HagerLand and a customer request was sent to you.'

/** `nextStep` replaces the provider sentences for services HagerLand handles itself (the staffing requirement). */
export function serviceRequestReceivedEmail(p: { name: string; reference: string; title: string; link: string; emergency: boolean; linkDays: number; nextStep?: string | null; preheader?: string | null; extraLine?: string | null }): RenderedEmail {
  return renderEmail({
    subject: `We've received your request (${p.reference})`,
    preheader: p.emergency ? 'Marked as an emergency: we are looking at it now.' : (p.preheader ?? 'We are finding the right providers for you.'),
    heading: 'Your request is with us',
    paragraphs: [
      `Hello ${p.name},`,
      `Thanks for your request: "${p.title}".`,
      p.emergency
        ? 'You marked it as an emergency, so we are looking at it first. If anyone is in danger, call the emergency services.'
        : (p.nextStep ?? 'We will match it with up to three suitable providers. Each one contacts you directly, and their quotes appear on your request page.'),
      ...(p.extraLine ? [p.extraLine] : []),
      `Keep this email: the button below opens your request${p.linkDays ? ` (the link works for ${p.linkDays} days; you can ask for a new one at any time)` : ''}.`,
    ],
    details: [['Reference', p.reference]],
    button: { label: 'View your request', href: p.link },
    reason: REQUESTER_REASON,
  })
}

/** Jobs Phase 3 (AB's approved wording, W row 9): no phone numbers or email addresses of candidates, ever. */
export function recruitmentIntroductionEmail(p: { reference: string; count: number; link: string }): RenderedEmail {
  const subject = `Candidates introduced for request ${p.reference}`
  const body = `We have introduced ${p.count} candidate(s) for your request ${p.reference}. Each of them agreed to be introduced to you. See their details on your request page.`
  return renderEmail({
    subject,
    preheader: body,
    heading: subject,
    paragraphs: [body],
    button: { label: 'See the candidates', href: p.link },
    reason: `Please use their details only for this request. Candidates must never be asked for money. ${REQUESTER_REASON}`,
  })
}

/** Jobs Phase 3 (AB's approved wording, W row 10). */
export function placementConfirmedEmail(p: { name: string; role: string; date: string }): RenderedEmail {
  const subject = `Placement confirmed: ${p.name}, starting ${p.date}`
  const body = `Thank you for confirming that ${p.name} starts work as ${p.role} on ${p.date}. If they leave within the replacement period in your written agreement, we will look for a replacement at no extra cost.`
  return renderEmail({ subject, preheader: body, heading: subject, paragraphs: [body], reason: REQUESTER_REASON })
}

/** `preheader` and `body` replace the quote wording for services HagerLand handles itself (the staffing requirement). */
export function serviceRequestLinkEmail(p: { name: string; reference: string; link: string; linkDays: number; preheader?: string | null; body?: string | null }): RenderedEmail {
  return renderEmail({
    subject: `Your link to request ${p.reference}`,
    preheader: p.preheader ?? 'A new link to view your request and quotes.',
    heading: 'Here is your new link',
    paragraphs: [`Hello ${p.name},`, p.body ?? `Use the button to see request ${p.reference} and any quotes. The link works for ${p.linkDays} days. Older links no longer work.`],
    button: { label: 'View your request', href: p.link },
    reason: REQUESTER_REASON,
  })
}

export function providerOfferedEmail(p: { orgName: string; reference: string; title: string; serviceName: string | null; place: string | null; urgency: string; url: string }): RenderedEmail {
  return renderEmail({
    subject: `${p.urgency === 'Emergency' ? 'Emergency request' : 'New customer request'}: ${p.title}`,
    preheader: `A customer needs ${p.serviceName ?? 'your services'}${p.place ? ` in ${p.place}` : ''}.`,
    heading: 'A customer request for you',
    paragraphs: [`HagerLand matched ${p.orgName} with this customer request. Accept it to see the customer's contact details and send a quote. If you can't take it on, decline so we can find someone else.`],
    details: [['Reference', p.reference], ['Request', p.title], ...(p.serviceName ? ([['Service', p.serviceName]] as [string, string][]) : []), ...(p.place ? ([['Where', p.place]] as [string, string][]) : []), ['How soon', p.urgency]],
    button: { label: 'Open the request', href: p.url },
    reason: PROVIDER_REASON,
  })
}

export function providerReminderEmail(p: { orgName: string; reference: string; title: string; url: string }): RenderedEmail {
  return renderEmail({
    subject: `Reminder: a customer is waiting (${p.reference})`,
    preheader: 'Please accept or decline this request.',
    heading: 'A customer is waiting for your answer',
    paragraphs: [`HagerLand sent ${p.orgName} the request "${p.title}" two days ago. Please accept or decline it so the customer is not left waiting.`],
    details: [['Reference', p.reference]],
    button: { label: 'Answer the request', href: p.url },
    reason: PROVIDER_REASON,
  })
}

export function serviceQuoteReceivedEmail(p: { name: string; reference: string; providerName: string; amount: string; link: string }): RenderedEmail {
  return renderEmail({
    subject: `New quote for your request (${p.reference})`,
    preheader: `${p.providerName} sent a quote.`,
    heading: 'You have a new quote',
    paragraphs: [`Hello ${p.name},`, `${p.providerName} sent a quote of ${p.amount} for your request. Compare quotes on your request page and choose the one you want when you are ready.`, 'Before you pay anything, agree the work, price and timing in writing.'],
    details: [['Reference', p.reference], ['From', p.providerName], ['Quote', p.amount]],
    button: { label: 'See your quotes', href: p.link },
    reason: REQUESTER_REASON,
  })
}

export function serviceNoProviderEmail(p: { name: string; reference: string; title: string }): RenderedEmail {
  return renderEmail({
    subject: `About your request (${p.reference})`,
    preheader: 'We could not find a suitable provider this time.',
    heading: "We couldn't find a provider this time",
    paragraphs: [
      `Hello ${p.name},`,
      `We're sorry: we could not find a suitable provider on HagerLand for "${p.title}" right now. We have closed the request so you are not left waiting.`,
      'New businesses join HagerLand every week. You are welcome to send a new request later, or reply to this email and we will try to help.',
    ],
    details: [['Reference', p.reference]],
    reason: REQUESTER_REASON,
  })
}

export function providerChosenEmail(p: { orgName: string; reference: string; title: string; url: string }): RenderedEmail {
  return renderEmail({
    subject: `The customer chose your quote (${p.reference})`,
    preheader: 'Get in touch to agree the details.',
    heading: 'The customer chose your quote',
    paragraphs: [`Good news: the customer chose ${p.orgName}'s quote for "${p.title}". Contact them to agree the work, price and timing in writing.`],
    details: [['Reference', p.reference]],
    button: { label: 'Open the request', href: p.url },
    reason: PROVIDER_REASON,
  })
}

export function propertyCareReceivedEmail(p: { name: string; reference: string; contactTime: string | null }): RenderedEmail {
  return renderEmail({
    subject: `Your HagerLand Property Care consultation request (${p.reference})`,
    preheader: 'We will contact you to arrange a consultation.',
    heading: 'Thank you: we will be in touch',
    paragraphs: [
      `Hello ${p.name},`,
      `We have your request for a consultation about ${brand.divisions.propertyCare}. A member of our team will contact you${p.contactTime ? ` (you said: ${p.contactTime})` : ''} to understand your property and what you need, and then send you a written proposal.`,
      'There is no obligation, and nothing is agreed until you have read and accepted the proposal.',
    ],
    details: [['Reference', p.reference]],
    button: { label: `About ${brand.divisions.propertyCare}`, href: canonicalUrl('/diaspora/property-care') },
    reason: `You are receiving this because you asked about ${brand.divisions.propertyCare} on HagerLand.`,
  })
}

export function savedSearchAlertEmail(p: { searchName: string; items: { title: string; price: string; place: string; url: string }[]; resultsUrl: string; manageUrl: string; unsubscribeUrl: string }): RenderedEmail {
  return { ...savedSearchAlertBody(p), headers: { 'List-Unsubscribe': `<${p.unsubscribeUrl}>` } }
}

function savedSearchAlertBody(p: { searchName: string; items: { title: string; price: string; place: string; url: string }[]; resultsUrl: string; manageUrl: string; unsubscribeUrl: string }): RenderedEmail {
  return renderEmail({
    subject: `${p.items.length} new ${p.items.length === 1 ? 'property' : 'properties'}: ${p.searchName}`,
    preheader: `New on HagerLand for your search “${p.searchName}”.`,
    heading: `New for “${p.searchName}”`,
    paragraphs: [`${p.items.length === 1 ? 'This property was' : 'These properties were'} added to HagerLand since we last emailed you about this search.`],
    details: p.items.map((i) => [`${i.title} · ${i.place}`, `${i.price} — ${i.url}`] as [string, string]),
    button: { label: 'See all results', href: p.resultsUrl },
    reason: 'You are receiving this because you saved this search on HagerLand.',
    footerLinks: [
      { label: 'Change how often', href: p.manageUrl },
      { label: 'Stop these emails', href: p.unsubscribeUrl },
    ],
  })
}

const EMPLOYER_REASON = 'You are receiving this because your organisation advertises jobs on HagerLand.'
const CANDIDATE_REASON = 'You are receiving this because you applied for a job on HagerLand.'

export function jobDecisionEmail(p: { name: string; title: string; approved: boolean; reason?: string | null; url: string; expiresAt: string | null }): RenderedEmail {
  return p.approved
    ? renderEmail({
        subject: `Your job is live: ${p.title}`,
        preheader: 'Candidates can now see and apply for your vacancy.',
        heading: 'Your job is live',
        paragraphs: [`Hello ${p.name},`, `"${p.title}" is now on the HagerLand job board.`, p.expiresAt ? `It stays open until ${formatDate(p.expiresAt)}.` : ''].filter(Boolean),
        button: { label: 'See your job', href: p.url },
        reason: EMPLOYER_REASON,
      })
    : renderEmail({
        subject: `Changes needed: ${p.title}`,
        preheader: 'Your job advert needs a few changes before it can go live.',
        heading: 'Your job advert needs some changes',
        paragraphs: [`Hello ${p.name},`, `We couldn't publish "${p.title}" yet. Here's what needs to change:`],
        quote: p.reason ?? undefined,
        button: { label: 'Edit and resubmit', href: canonicalUrl('/account/jobs') },
        reason: EMPLOYER_REASON,
      })
}

/** `byPhone`: the application came by phone (no cover note or CV), Jobs Phase 2. */
export function newApplicationEmail(p: { orgName: string; title: string; reference: string; applicantName: string; url: string; byPhone?: boolean }): RenderedEmail {
  return renderEmail({
    subject: `New application for ${p.title} (${p.reference})`,
    preheader: `${p.applicantName} applied for ${p.title}.`,
    heading: 'You have a new application',
    paragraphs: [`Hello ${p.orgName},`, p.byPhone ? `${p.applicantName} applied for "${p.title}" by phone. Open the application to see how to contact them.` : `${p.applicantName} applied for "${p.title}". Open the application to read the cover note and download the CV.`],
    details: [['Reference', p.reference]],
    button: { label: 'View the application', href: p.url },
    reason: EMPLOYER_REASON,
  })
}

export function applicationReceivedEmail(p: { name: string; title: string; employer: string; reference: string }): RenderedEmail {
  return renderEmail({
    subject: `Application sent: ${p.title} (${p.reference})`,
    preheader: `We've sent your application to ${p.employer}.`,
    heading: 'Your application has been sent',
    paragraphs: [
      `Hello ${p.name},`,
      `We've sent your application for "${p.title}" to ${p.employer}. They will contact you directly if they want to take it further.`,
      'You can follow its progress, or withdraw it, from your account.',
    ],
    details: [['Reference', p.reference]],
    button: { label: 'My applications', href: canonicalUrl('/account/applications') },
    reason: CANDIDATE_REASON,
  })
}

const TRADE_REASON = 'You are receiving this because you applied for a HagerLand Supply trade account.'

export function tradeApplicationEmail(p: { name: string; reference: string }): RenderedEmail {
  return renderEmail({
    subject: `Trade account application received (${p.reference})`,
    preheader: 'We check every trade application, usually within 2 business days.',
    heading: 'Thanks for applying for a trade account',
    paragraphs: [`Hello ${p.name},`, 'We have received your application. We check every application and will email you when it has been decided. Once approved, you will see trade prices when you are signed in.'],
    details: [['Reference', p.reference]],
    reason: TRADE_REASON,
  })
}

export function tradeDecisionEmail(p: { name: string; approved: boolean; note?: string | null }): RenderedEmail {
  return renderEmail({
    subject: p.approved ? 'Your trade account is approved' : 'About your trade account application',
    preheader: p.approved ? 'Sign in to see trade prices on HagerLand Supply.' : 'We could not approve your trade account.',
    heading: p.approved ? 'Your trade account is approved' : 'We could not approve your application',
    paragraphs: p.approved
      ? [`Hello ${p.name},`, 'Your HagerLand Supply trade account is now active. Sign in to see trade prices on products that have them, and send your quote list as usual.']
      : [`Hello ${p.name},`, 'We are sorry, we could not approve your trade account application this time.'],
    quote: p.approved ? undefined : p.note ?? undefined,
    button: { label: p.approved ? 'Browse supplies' : 'Contact us', href: canonicalUrl(p.approved ? '/supplies' : '/contact') },
    reason: TRADE_REASON,
  })
}

export function teamInvitationEmail(p: { orgName: string; inviterName: string; role: string; link: string }): RenderedEmail {
  return renderEmail({
    subject: `You're invited to join ${p.orgName} on HagerLand`,
    preheader: `${p.inviterName} invited you to manage ${p.orgName} on HagerLand.`,
    heading: `Join ${p.orgName} on HagerLand`,
    paragraphs: [
      'Hello,',
      `${p.inviterName} has invited you to join ${p.orgName} on HagerLand as ${p.role === 'admin' ? 'an admin' : 'a team member'}.`,
      'Open the link below and sign in, or create a free account, with this email address. The link works for 7 days.',
    ],
    button: { label: 'Accept the invitation', href: p.link },
    reason: 'You are receiving this because a HagerLand business invited this email address to its team. If you were not expecting it, you can ignore this email.',
  })
}

/** Jobs Phase 4 (AB's approved wording W21): one email 30 days before a Verified badge ends. */
export function badgeEndingEmail(p: { date: string; link: string }): RenderedEmail {
  const body = `To keep the Verified badge, upload your current trade licence in your account. If we don't hear from you, the badge will end on ${p.date}.`
  return renderEmail({
    subject: `Your HagerLand Verified badge ends on ${p.date}`,
    preheader: body,
    heading: `Your HagerLand Verified badge ends on ${p.date}`,
    paragraphs: [body],
    button: { label: 'Keep my badge', href: p.link },
    reason: LISTER_REASON,
  })
}

/** Jobs Phase 4 (AB's approved wording W20): a job paused after a report. Never names the reporter. */
export function jobPausedEmail(p: { title: string }): RenderedEmail {
  const subject = 'Your job advert is paused while we check it'
  const body = `We have paused your job "${p.title}" while we check it. We will be in touch if we need anything from you.`
  return renderEmail({ subject, preheader: body, heading: subject, paragraphs: [body], reason: EMPLOYER_REASON })
}
