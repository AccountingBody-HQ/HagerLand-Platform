import { describe, expect, it } from 'vitest'
import * as T from '@/lib/email/templates'
import type { RenderedEmail } from '@/lib/email/layout'

/** Every transactional email (spec 15.2, 25.4): HTML and plain text, header, footer reason, and user text escaped. */

const X = '<script>alert("x")</script> & Tom’s'
const url = 'https://www.hagerland.com/x'

const ALL: Record<string, () => RenderedEmail> = {
  listingSubmitted: () => T.listingSubmittedEmail({ name: X, title: X }),
  listingApproved: () => T.listingApprovedEmail({ name: X, title: X, url, expiresAt: '2026-12-01' }),
  listingRejected: () => T.listingRejectedEmail({ name: X, title: X, reason: X }),
  listingExpiring: () => T.listingExpiringEmail({ name: X, title: X, expiresAt: '2026-12-01' }),
  listingExpired: () => T.listingExpiredEmail({ name: X, title: X }),
  newEnquiry: () => T.newEnquiryEmail({ reference: 'HLE-1', subjectLine: X, targetLabel: X, targetUrl: url, name: X, phone: '+251911000000', email: 'a@b.c', preferredContact: 'phone', intentLabel: 'Book a viewing', message: X }),
  enquiryConfirmation: () => T.enquiryConfirmationEmail({ name: X, reference: 'HLE-1', targetLabel: X, recipientLabel: X, message: X }),
  registerInterest: () => T.registerInterestConfirmationEmail({ name: X, reference: 'HLR-1', projectName: X }),
  quoteReceived: () => T.quoteReceivedEmail({ name: X, reference: 'HLQ-1', itemCount: 3, hasFiles: true }),
  quoteInternal: () => T.quoteInternalEmail({ reference: 'HLQ-1', name: X, phone: '+251911000000', email: null, source: 'materials list', lines: [X], notes: X, adminUrl: url }),
  quoteIssued: () => T.quoteIssuedEmail({ name: X, reference: 'HLQ-1', totalCents: 1234500, hasDocument: true, validDays: 14 }),
  claimDecision: () => T.claimDecisionEmail({ name: X, orgName: X, approved: false, note: X }),
  claimSubmitted: () => T.claimSubmittedEmail({ name: X, orgName: X }),
  verificationDecision: () => T.verificationDecisionEmail({ name: X, orgName: X, approved: false, note: X }),
  orgDecision: () => T.orgDecisionEmail({ name: X, orgName: X, approved: false, reason: X, url }),
  adminDigest: () => T.adminDigestEmail({ lines: [[X, X]], adminUrl: url }),
  adminDigestFallback: () => T.adminDigestFallbackEmail({ problem: X, run: X, adminUrl: url }),
  adminNotice: () => T.adminNoticeEmail({ subject: 'Notice', heading: X, lines: [[X, X]], adminUrl: url }),
  accountDeleted: () => T.accountDeletedEmail({ name: X }),
  interestConfirmation: () => T.interestConfirmationEmail({ name: X, reference: 'HLI-1', verticalName: X, href: url, live: false }),
  partnerApplication: () => T.partnerApplicationEmail({ name: X, organisation: X, reference: 'HLP-1', verticalName: X }),
  serviceRequestReceived: () => T.serviceRequestReceivedEmail({ name: X, reference: 'HLS-1', title: X, link: url, emergency: true, linkDays: 30 }),
  serviceRequestLink: () => T.serviceRequestLinkEmail({ name: X, reference: 'HLS-1', link: url, linkDays: 30 }),
  providerOffered: () => T.providerOfferedEmail({ orgName: X, reference: 'HLS-1', title: X, serviceName: X, place: X, urgency: 'Soon', url }),
  providerReminder: () => T.providerReminderEmail({ orgName: X, reference: 'HLS-1', title: X, url }),
  serviceQuoteReceived: () => T.serviceQuoteReceivedEmail({ name: X, reference: 'HLS-1', providerName: X, amount: 'ETB 1,000', link: url }),
  serviceNoProvider: () => T.serviceNoProviderEmail({ name: X, reference: 'HLS-1', title: X }),
  providerChosen: () => T.providerChosenEmail({ orgName: X, reference: 'HLS-1', title: X, url }),
  propertyCareReceived: () => T.propertyCareReceivedEmail({ name: X, reference: 'HLC-1', contactTime: X }),
  savedSearchAlert: () => T.savedSearchAlertEmail({ searchName: X, items: [{ title: X, price: 'ETB 1', place: X, url }], resultsUrl: url, manageUrl: url, unsubscribeUrl: url }),
  jobDecision: () => T.jobDecisionEmail({ name: X, title: X, approved: false, reason: X, url, expiresAt: null }),
  newApplication: () => T.newApplicationEmail({ orgName: X, title: X, reference: 'HLA-1', applicantName: X, url }),
  applicationReceived: () => T.applicationReceivedEmail({ name: X, title: X, employer: X, reference: 'HLA-1' }),
  tradeApplication: () => T.tradeApplicationEmail({ name: X, reference: 'HLT-1' }),
  tradeDecision: () => T.tradeDecisionEmail({ name: X, approved: false, note: X }),
  teamInvitation: () => T.teamInvitationEmail({ orgName: X, inviterName: X, role: 'admin', link: url }),
  recruitmentIntroduction: () => T.recruitmentIntroductionEmail({ reference: X, count: 2, link: url }),
  placementConfirmed: () => T.placementConfirmedEmail({ name: X, role: X, date: '1 November 2026' }),
  badgeEnding: () => T.badgeEndingEmail({ date: X, link: url }),
  jobPaused: () => T.jobPausedEmail({ title: X }),
  partnerRegistrationReceived: () => T.partnerRegistrationReceivedEmail({ reference: 'HLB-2026-000001', business: X }),
  partnerInvitation: () => T.partnerInvitationEmail({ name: X, business: X, link: url }),
  orderRequestReceived: () => T.orderRequestReceivedEmail({ reference: X, link: url }),
  orderRequestReserved: () => T.orderRequestReservedEmail({ reference: X, until: '31 Oct 2026, 14:30', amount: 'ETB 27,015', paymentDetails: X }),
  orderRequestPartial: () => T.orderRequestPartialEmail({ reference: X, available: X, unavailable: X }),
  orderRequestUnavailable: () => T.orderRequestUnavailableEmail({ reference: X, items: X }),
  orderRequestExpired: () => T.orderRequestExpiredEmail({ reference: X }),
  orderRequestPaid: () => T.orderRequestPaidEmail({ reference: X, amount: 'ETB 27,015' }),
  orderRequestCancelled: () => T.orderRequestCancelledEmail({ reference: X, refundAmount: null }),
  orderRequestDelivered: () => T.orderRequestDeliveredEmail({ reference: X }),
  orderRequestInternal: () => T.orderRequestInternalEmail({ reference: X, adminUrl: url }),
  partnerRegistrationInternal: () => T.partnerRegistrationInternalEmail({ reference: 'HLB-2026-000001', business: X, roles: 'Manufacturer', adminUrl: url }),
}

describe('email templates', () => {
  it('covers every exported template', () => {
    const exported = Object.keys(T).filter((k) => k.endsWith('Email'))
    expect(exported.length).toBe(Object.keys(ALL).length)
  })
  it.each(Object.entries(ALL))('%s renders HTML and plain text with the branded layout and escapes user text', (_name, render) => {
    const e = render()
    expect(e.subject.length).toBeGreaterThan(5)
    expect(e.html).toContain('<!doctype html>')
    expect(e.html).toContain('HagerLand')
    expect(e.html).not.toContain('<script>alert')
    expect(e.html).toContain('&lt;script&gt;')
    expect(e.text.length).toBeGreaterThan(40)
    expect(e.text).not.toMatch(/<\/?(p|table|td|div)\b/)
    // Every email says why the recipient is getting it.
    expect(e.text).toMatch(/You are receiving this|Internal (notification|daily digest)/)
  })
})
