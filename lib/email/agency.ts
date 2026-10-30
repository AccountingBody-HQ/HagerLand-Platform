import 'server-only'
import { brand } from '@/lib/brand'
import { formatAppointment, formatETB } from '@/lib/format'
import { canonicalUrl } from '@/lib/site'
import { renderEmail, type RenderedEmail } from './layout'

/** Emails for HagerLand's estate agency (spec 26.5, 26.6). User text is escaped by renderEmail. */

const account = (path: string) => ({ label: 'See it in your account', href: canonicalUrl(path) })

export function valuationReceivedEmail(p: { name: string; reference: string; preferredTimes: string | null }): RenderedEmail {
  return renderEmail({
    subject: `Your market appraisal request (${p.reference})`,
    preheader: 'A HagerLand agent will contact you to arrange a visit.',
    heading: 'Thank you: we will arrange your market appraisal',
    paragraphs: [
      `Hello ${p.name},`,
      `We have your request for a market appraisal by ${brand.name}'s estate agency. An agent will contact you${p.preferredTimes ? ` (you said: ${p.preferredTimes})` : ''} to arrange a visit.`,
      'A market appraisal is our opinion of what the property could sell or let for, not a formal valuation by a licensed valuer. There is no obligation to instruct us afterwards.',
    ],
    details: [['Reference', p.reference]],
    button: account('/account/agency'),
    reason: `You are receiving this because you asked ${brand.name} for a market appraisal of a property.`,
  })
}

export function viewingRequestedEmail(p: { name: string; reference: string; property: string; mode: string }): RenderedEmail {
  return renderEmail({
    subject: `Your viewing request (${p.reference})`,
    preheader: 'We will confirm a time with you.',
    heading: 'We have your viewing request',
    paragraphs: [`Hello ${p.name},`, `Thank you for asking to view ${p.property} (${p.mode.toLowerCase()}). We will contact you to confirm a time. Please do not pay any money before you have viewed the property and seen its documents.`],
    details: [['Reference', p.reference]],
    button: account('/account/agency'),
    reason: `You are receiving this because you asked to view a property marketed by ${brand.name}.`,
  })
}

export function viewingConfirmedEmail(p: { name: string; reference: string; property: string; when: string; mode: string; videoLink: string | null; reminder?: boolean }): RenderedEmail {
  return renderEmail({
    subject: `${p.reminder ? 'Reminder: viewing' : 'Viewing confirmed'} ${formatAppointment(p.when)} (${p.reference})`,
    preheader: `${p.property}, ${formatAppointment(p.when)}.`,
    heading: p.reminder ? 'Your viewing is coming up' : 'Your viewing is confirmed',
    paragraphs: [`Hello ${p.name},`, p.mode === 'video' ? 'Your video viewing is confirmed. Use the link below at the time shown.' : 'Your viewing is confirmed. Your agent will meet you at the property.', 'If you can no longer make it, please reply to this email so we can offer the time to someone else.'],
    details: [['Property', p.property], ['When', formatAppointment(p.when)], ['How', p.mode === 'video' ? 'Video call' : 'In person'], ...(p.videoLink ? ([['Video link', p.videoLink]] as [string, string][]) : []), ['Reference', p.reference]],
    button: p.videoLink ? { label: 'Join the video call', href: p.videoLink } : account('/account/agency'),
    reason: `You are receiving this because you booked a viewing with ${brand.name}.`,
  })
}

export function offerReceivedEmail(p: { name: string; reference: string; property: string; amount: number }): RenderedEmail {
  return renderEmail({
    subject: `Your offer on ${p.property} (${p.reference})`,
    preheader: 'We will pass it to the owner and come back to you.',
    heading: 'We have your offer',
    paragraphs: [
      `Hello ${p.name},`,
      `Thank you for your offer of ${formatETB(p.amount)}. We will put it to the owner and tell you their decision.`,
      'Your offer is an expression of interest only. It does not commit you or the owner to anything until a written sale agreement is signed.',
    ],
    details: [['Reference', p.reference], ['Offer', formatETB(p.amount)]],
    button: account('/account/agency'),
    reason: `You are receiving this because you made an offer through ${brand.name}.`,
  })
}

export function offerDecisionEmail(p: { name: string; reference: string; property: string; status: string; counterAmount: number | null }): RenderedEmail {
  const text: Record<string, string> = {
    accepted: 'The owner has accepted your offer in principle. We will contact you about the next steps. Nothing is binding until a written sale agreement is signed.',
    rejected: 'The owner has decided not to accept your offer. You are welcome to make a new offer.',
    countered: `The owner has suggested ${p.counterAmount ? formatETB(p.counterAmount) : 'a different price'}. Reply to this email or call us to discuss.`,
  }
  return renderEmail({
    subject: `Update on your offer (${p.reference})`,
    preheader: `An update on ${p.property}.`,
    heading: 'An update on your offer',
    paragraphs: [`Hello ${p.name},`, text[p.status] ?? 'There is an update on your offer.'],
    details: [['Property', p.property], ['Reference', p.reference]],
    button: account('/account/agency'),
    reason: `You are receiving this because you made an offer through ${brand.name}.`,
  })
}

export function applicationReceivedEmail(p: { name: string; reference: string; property: string }): RenderedEmail {
  return renderEmail({
    subject: `Your application to rent (${p.reference})`,
    preheader: 'We will check your application and come back to you.',
    heading: 'We have your application',
    paragraphs: [`Hello ${p.name},`, `Thank you for applying to rent ${p.property}. We will check your details with the landlord and contact you. Please do not pay rent or a deposit until a tenancy agreement is ready to sign.`],
    details: [['Reference', p.reference]],
    button: account('/account/agency'),
    reason: `You are receiving this because you applied to rent a property marketed by ${brand.name}.`,
  })
}

export function applicationDecisionEmail(p: { name: string; reference: string; property: string; approved: boolean }): RenderedEmail {
  return renderEmail({
    subject: `Your application to rent (${p.reference})`,
    preheader: p.approved ? 'Good news about your application.' : 'An update on your application.',
    heading: p.approved ? 'Your application has been approved' : 'An update on your application',
    paragraphs: [
      `Hello ${p.name},`,
      p.approved ? `The landlord has approved your application for ${p.property}. We will send you the tenancy agreement and agree a move-in date with you.` : `The landlord has decided not to go ahead with your application for ${p.property}. We can tell you about other properties to rent.`,
    ],
    details: [['Reference', p.reference]],
    button: account('/account/agency'),
    reason: `You are receiving this because you applied to rent a property marketed by ${brand.name}.`,
  })
}

export function requirementMatchesEmail(p: { name: string; items: { title: string; price: string; url: string }[] }): RenderedEmail {
  return renderEmail({
    subject: `${p.items.length} ${p.items.length === 1 ? 'property' : 'properties'} that match what you are looking for`,
    preheader: `Chosen for you by ${brand.name}'s agents.`,
    heading: 'Properties that match your requirements',
    paragraphs: [`Hello ${p.name},`, `Our agents picked ${p.items.length === 1 ? 'this property' : 'these properties'} for you from what is on ${brand.name} now. Reply to this email to arrange a viewing.`],
    details: p.items.map((i) => [i.title, `${i.price} — ${i.url}`] as [string, string]),
    reason: `You are receiving this because you registered your property requirements with ${brand.name}'s estate agency and agreed to hear about matching properties. Reply "stop" and we will not email you again.`,
  })
}

export function tenancyReminderEmail(p: { kind: 'renewal' | 'notice'; title: string; reference: string; date: string; tenant: string }): RenderedEmail {
  return renderEmail({
    subject: `Tenancy ${p.kind === 'renewal' ? 'renewal' : 'notice'} date coming up: ${p.title} (${p.reference})`,
    preheader: `${p.kind === 'renewal' ? 'Renewal' : 'Notice'} date ${p.date}.`,
    heading: p.kind === 'renewal' ? 'A tenancy is due for renewal' : 'A tenancy notice date is coming up',
    paragraphs: [`The ${p.kind} date for this tenancy is ${p.date}. Contact the landlord and tenant to agree what happens next.`],
    details: [['Tenancy', p.title], ['Tenant', p.tenant], ['Reference', p.reference], ['Date', p.date]],
    button: { label: 'Open the tenancy', href: canonicalUrl('/roodber8/agency/tenancies') },
    reason: 'Internal reminder for HagerLand agents.',
  })
}
