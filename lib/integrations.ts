/**
 * Integration points for services that need third-party contracts AB has not set up yet (spec 25.3, 26.17). Each has
 * an interface the rest of the code can call once a provider is chosen, and reports "not configured" until then.
 * Nothing here sends money, messages or data anywhere.
 */

export interface PaymentProvider {
  /** Starts a payment for an order or invoice and returns where to send the customer. */
  createPayment(input: { reference: string; amountMinor: number; currency: string; customerEmail: string }): Promise<{ redirectUrl: string; providerRef: string }>
}

export interface SmsProvider {
  sendCode(phoneE164: string, code: string): Promise<void>
}

export interface WhatsAppProvider {
  sendTemplate(phoneE164: string, template: string, params: string[]): Promise<void>
}

export interface PartnerApi {
  /** Passes a finance or insurance request to a partner's own system. */
  submitLead(input: { reference: string; category: string; contact: { name: string; email: string | null; phone: string } }): Promise<{ partnerRef: string }>
}

export interface IntegrationStatus {
  key: 'payments' | 'sms' | 'whatsapp' | 'partner_api' | 'native_apps'
  name: string
  configured: boolean
  note: string
}

/** What is connected today. All are deferred by rule until AB signs up with a provider (spec 25.3). */
export function integrationStatuses(): IntegrationStatus[] {
  return [
    { key: 'payments', name: 'Online payments (Chapa, Telebirr, cards)', configured: false, note: 'Quotes, deals and agency fees are recorded; customers pay offline.' },
    { key: 'sms', name: 'SMS and phone sign-in codes', configured: false, note: 'Sign-in uses email and password or an email link.' },
    { key: 'whatsapp', name: 'WhatsApp Business notifications', configured: false, note: 'Notifications go by email; listings link to WhatsApp chats directly.' },
    { key: 'partner_api', name: 'Bank, insurer and mortgage partner connections', configured: false, note: 'Finance and insurance requests reach partners by email and their account.' },
    { key: 'native_apps', name: 'Native mobile apps', configured: false, note: 'The website works on phones.' },
  ]
}
