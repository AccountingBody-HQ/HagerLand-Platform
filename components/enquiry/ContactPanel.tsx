'use client'

import Link from 'next/link'
import { useState } from 'react'
import { BadgeCheck, Flag, Mail, MessageCircle, Phone, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { EnquiryForm, type EnquiryTarget, type IntentOption } from './EnquiryForm'
import { ReportForm } from './ReportForm'
import { track } from '@/lib/analytics'
import { cn } from '@/lib/cn'

type Channel = 'phone' | 'whatsapp' | 'telegram' | 'email'

export interface ContactPanelProps {
  revealTarget: { type: 'property' | 'organisation' | 'development' | 'product'; id: string } | null
  enquiryTarget: EnquiryTarget
  intents: IntentOption[]
  lister: { name: string; href?: string | null; verified?: boolean; subtitle?: string; logoUrl?: string | null }
  channels: Partial<Record<Channel, boolean>>
  reportTarget?: { type: 'property' | 'organisation' | 'development' | 'product'; id: string }
  /** Also render the fixed mobile bottom bar (detail pages only). */
  mobileBar?: boolean
  heading?: string
}

function useReveal(target: ContactPanelProps['revealTarget']) {
  const [values, setValues] = useState<Partial<Record<Channel, { display: string; href: string }>>>({})
  const [loading, setLoading] = useState<Channel | null>(null)
  const toast = useToast()
  async function reveal(channel: Channel, open: boolean) {
    if (!target) return
    const existing = values[channel]
    if (existing) {
      if (open) window.location.href = existing.href
      return
    }
    setLoading(channel)
    try {
      const res = await fetch('/api/contact-reveal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target_type: target.type, target_id: target.id, channel }) })
      const data = (await res.json()) as { display?: string; href?: string; error?: string }
      if (!res.ok || !data.href || !data.display) throw new Error(data.error ?? 'Not available')
      setValues((v) => ({ ...v, [channel]: { display: data.display as string, href: data.href as string } }))
      track('contact_revealed', { channel, target_type: target.type })
      if (open) window.location.href = data.href
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Please try again.', 'error')
    } finally {
      setLoading(null)
    }
  }
  return { values, loading, reveal }
}

/** Lister identity, tap-to-reveal contacts and the enquiry form (sticky on desktop; bottom bar on mobile). */
export function ContactPanel({ revealTarget, enquiryTarget, intents, lister, channels, reportTarget, mobileBar, heading = 'Contact' }: ContactPanelProps) {
  const { values, loading, reveal } = useReveal(revealTarget)
  const [enquiryOpen, setEnquiryOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const rows: { channel: Channel; label: string; icon: React.ReactNode }[] = [
    { channel: 'phone', label: 'Show phone number', icon: <Phone /> },
    { channel: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle /> },
    { channel: 'telegram', label: 'Telegram', icon: <Send /> },
    { channel: 'email', label: 'Show email', icon: <Mail /> },
  ]
  const available = rows.filter((r) => channels[r.channel])

  return (
    <>
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <h2 className="sr-only">{heading}</h2>
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-100 font-display text-h3 font-bold text-ink">
            {lister.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lister.logoUrl} alt="" className="size-full object-cover" />
            ) : (
              lister.name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            {lister.href ? (
              <Link href={lister.href} className="line-clamp-1 font-semibold text-ink hover:underline">
                {lister.name}
              </Link>
            ) : (
              <p className="line-clamp-1 font-semibold text-ink">{lister.name}</p>
            )}
            <p className="flex items-center gap-1 text-small text-muted">
              {lister.verified && <BadgeCheck className="size-4 text-gold" aria-hidden />}
              {lister.subtitle}
            </p>
          </div>
        </div>

        {available.length > 0 && revealTarget && (
          <ul className="mt-5 space-y-2">
            {available.map((r) => {
              const v = values[r.channel]
              return (
                <li key={r.channel}>
                  {v ? (
                    <a href={v.href} target={r.channel === 'whatsapp' || r.channel === 'telegram' ? '_blank' : undefined} rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-md border border-green bg-green-tint font-semibold text-green-darker [&_svg]:size-[18px]">
                      {r.icon} {v.display}
                    </a>
                  ) : (
                    <Button variant="secondary" fullWidth loading={loading === r.channel} onClick={() => reveal(r.channel, r.channel === 'whatsapp' || r.channel === 'telegram')}>
                      {r.icon} {r.label}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-5 border-t border-border pt-5">
          <EnquiryForm target={enquiryTarget} intents={intents} idPrefix="panel" />
        </div>
        {reportTarget && (
          <button type="button" onClick={() => setReportOpen(true)} className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-small text-muted hover:text-ink">
            <Flag className="size-4" aria-hidden /> Report this {reportTarget.type === 'organisation' ? 'profile' : 'listing'}
          </button>
        )}
      </div>

      {mobileBar && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div className="flex gap-2 [&>*]:flex-1">
            {channels.phone && revealTarget && (
              <Button variant="secondary" loading={loading === 'phone'} onClick={() => reveal('phone', true)}>
                <Phone /> Call
              </Button>
            )}
            {channels.whatsapp && revealTarget && (
              <Button variant="secondary" loading={loading === 'whatsapp'} onClick={() => reveal('whatsapp', true)}>
                <MessageCircle /> WhatsApp
              </Button>
            )}
            <Button onClick={() => setEnquiryOpen(true)}>Enquire</Button>
          </div>
        </div>
      )}

      <Dialog open={enquiryOpen} onClose={() => setEnquiryOpen(false)} title={`Contact ${lister.name}`} variant="sheet">
        <EnquiryForm target={enquiryTarget} intents={intents} idPrefix="sheet" />
      </Dialog>
      {reportTarget && (
        <Dialog open={reportOpen} onClose={() => setReportOpen(false)} title="Report a problem" variant="sheet">
          <ReportForm target={reportTarget} />
        </Dialog>
      )}
      {mobileBar && <div className={cn('h-20 lg:hidden')} aria-hidden />}
    </>
  )
}
