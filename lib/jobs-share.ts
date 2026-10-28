// Jobs Phase 5: share links for live job pages and the admin "Copy for Telegram" text (AB's approved wording W6, W7 and
// W16). No tracking tags (AB's decision). Private-client jobs never name the employer. Pure: shared by pages and tests.
import { fill, type Translate } from '@/lib/i18n/translate'

export const SHARE_TEXT = {
  public: '{title} in {place}. See the job and apply on HagerLand: {link}',
  privateClient: '{title} in {place}, posted by HagerLand for a private client. See the job and apply on HagerLand: {link}',
} as const

export const TELEGRAM_TEXT = {
  public: 'New job: {title} in {place}{pay}. Apply on HagerLand: {link}',
  privateClient: '{title} in {place}, posted by HagerLand for a private client. Apply on HagerLand: {link}',
} as const

export interface ShareJob {
  title: string
  /** The town or area (the first part of the location). */
  place: string
  /** The job's address on the canonical host (the /am address on Amharic pages). */
  link: string
  privateClient: boolean
}

/** W6 / W7, in the page's language. */
export function shareText(job: ShareJob, t: Translate = (s) => s): string {
  return fill(t(job.privateClient ? SHARE_TEXT.privateClient : SHARE_TEXT.public), { title: job.title, place: job.place, link: job.link })
}

/** WhatsApp and Telegram share addresses (the visitor picks who to send it to). */
export function shareLinks(text: string, link: string): { whatsapp: string; telegram: string } {
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`,
  }
}

/** W16 for HagerLand's own Telegram channel, always English. `pay` is the formatted salary, if any. */
export function telegramPostText(job: ShareJob & { pay: string | null }): string {
  if (job.privateClient) return fill(TELEGRAM_TEXT.privateClient, { title: job.title, place: job.place, link: job.link })
  return fill(TELEGRAM_TEXT.public, { title: job.title, place: job.place, pay: job.pay ? `, ${job.pay}` : '', link: job.link })
}
