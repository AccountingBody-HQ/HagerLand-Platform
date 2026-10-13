import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Mail, MessageCircle, Phone } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { EnquiryStatusForm } from '@/components/account/EnquiryStatusForm'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Layout'
import { ENQUIRY_STATUS, TARGET_LABEL } from '@/lib/enquiry-labels'
import { INTENT_LABELS } from '@/lib/enquiries'
import { formatDate, formatPhone, whatsappLink } from '@/lib/format'

export const metadata = { title: 'Enquiry' }

export default async function EnquiryDetailPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/account/enquiries/${params.id}`)
  const supabase = getServerSupabase()
  const { data: e } = await supabase.from('enquiries').select('id, reference, target_type, target_id, sender_user_id, name, phone, email, message, preferred_contact, intent, details, status, recipient_notes, first_viewed_at, source_url, created_at').eq('id', params.id).maybeSingle()
  if (!e) notFound()
  const isRecipient = e.sender_user_id !== user.id
  if (isRecipient && !e.first_viewed_at) await supabase.from('enquiries').update({ first_viewed_at: new Date().toISOString() }).eq('id', e.id)
  const details = (e.details as Record<string, string> | null) ?? {}
  const s = ENQUIRY_STATUS[e.status]

  return (
    <div className="space-y-6">
      <Link href="/account/enquiries" className="inline-flex min-h-11 items-center gap-1.5 text-small font-semibold text-green">
        <ArrowLeft className="size-4" aria-hidden /> All enquiries
      </Link>
      <AccountPageHeader title={`${INTENT_LABELS[e.intent] ?? 'Enquiry'} from ${e.name}`} description={<span className="flex flex-wrap items-center gap-2"><Badge tone={s.tone}>{s.label}</Badge><span>{e.reference} · {formatDate(e.created_at)} · {TARGET_LABEL[e.target_type]}</span></span>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="space-y-5 p-5 sm:p-6">
          <p className="whitespace-pre-line text-[1.0625rem]">{e.message}</p>
          {Object.keys(details).length > 0 && (
            <dl className="grid gap-3 rounded-lg bg-stone-50 p-4 sm:grid-cols-2">
              {Object.entries(details).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-small capitalize text-muted">{k.replace(/_/g, ' ')}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {e.source_url && (
            <p className="text-small text-muted">
              Sent from{' '}
              <a href={e.source_url} className="text-green underline" target="_blank" rel="noopener noreferrer">
                {e.source_url.replace(/^https?:\/\/[^/]+/, '') || '/'}
              </a>
            </p>
          )}
        </Card>
        <div className="space-y-4">
          {isRecipient && (
            <Card className="space-y-2 p-5">
              <h2 className="font-semibold">Reply to {e.name}</h2>
              {e.preferred_contact && <p className="text-small text-muted">Prefers: {e.preferred_contact}</p>}
              <a href={`tel:${e.phone}`} className="flex min-h-11 items-center gap-2 rounded-md border border-border-strong px-3 font-semibold hover:bg-stone-50">
                <Phone className="size-4 text-green" aria-hidden /> {formatPhone(e.phone)}
              </a>
              <a href={whatsappLink(e.phone, `Hello ${e.name}, thank you for your enquiry on HagerLand (${e.reference}).`)} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 rounded-md border border-border-strong px-3 font-semibold hover:bg-stone-50">
                <MessageCircle className="size-4 text-green" aria-hidden /> WhatsApp
              </a>
              {e.email && (
                <a href={`mailto:${e.email}?subject=${encodeURIComponent(`Re: your enquiry ${e.reference}`)}`} className="flex min-h-11 items-center gap-2 rounded-md border border-border-strong px-3 font-semibold hover:bg-stone-50">
                  <Mail className="size-4 text-green" aria-hidden /> {e.email}
                </a>
              )}
            </Card>
          )}
          {isRecipient && (
            <Card className="p-5">
              <EnquiryStatusForm id={e.id} status={e.status} notes={e.recipient_notes} />
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
