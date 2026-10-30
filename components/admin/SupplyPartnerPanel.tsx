'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { FileText } from 'lucide-react'
import {
  addSupplyEvidenceAction,
  removeSupplyContactAction,
  removeSupplyEvidenceAction,
  saveSupplyContactAction,
  saveSupplyPartnerAction,
  setSupplyPartnerStatusAction,
} from '@/app/roodber8/actions/supply-partners'
import { CONFIDENCE_LEVELS, CONSENT_BASES, CONTACT_CHANNELS, labelFor, PARTNER_SOURCES, RELATIONSHIP_STATUSES, REVERIFY_MONTHS, SUPPLY_ROLES, type SupplyContactInput, type SupplyProfileInput } from '@/lib/supply/partners'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { FileDrop } from '@/components/media/FileDrop'
import { rememberVersion, useLatestVersion } from '@/lib/admin/latest-version'
import { StatusBadge } from './AdminUi'
import { SupplyContactLinks } from './SupplyContactLinks'

type Result = { ok: true; data: { message: string; updatedAt?: string } } | { ok: false; error: string }

export interface SupplyPartnerView {
  roles: string[]
  relationship_status: string
  status_changed_at: string | null
  aka: string[]
  source: string | null
  source_note: string | null
  captured_at: string | null
  captured_by: string | null
  confidence: string | null
  licence_seen_at: string | null
  tin_checked_at: string | null
  site_visit_at: string | null
  verified_by: string | null
  reverify_by: string | null
  notes: string | null
  updated_at: string
}

export interface SupplyContactView {
  id: string
  name: string
  role: string | null
  phone: string | null
  phone_normalised: string | null
  whatsapp: string | null
  telegram: string | null
  preferred_channel: string | null
  email: string | null
  consent_basis: string | null
  consent_note: string | null
  do_not_contact: boolean
  last_contacted_at: string | null
}

/** Runs a save; `versionKey` remembers the record's new updated_at for the panel's other buttons (lib/admin/latest-version). */
function useRun(versionKey?: string) {
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  return {
    pending,
    run: (fn: () => Promise<Result>, after?: () => void) =>
      start(async () => {
        const res = await fn()
        toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
        if (res.ok) {
          if (versionKey) rememberVersion(versionKey, res.data.updatedAt)
          after?.()
          router.refresh()
        }
      }),
  }
}

const day = (v: string | null) => (v ? v.slice(0, 10) : '')

function profileFrom(p: SupplyPartnerView | null): SupplyProfileInput {
  return {
    roles: p?.roles ?? [],
    aka: p?.aka ?? [],
    source: p?.source ?? '',
    source_note: p?.source_note ?? '',
    captured_at: day(p?.captured_at ?? null),
    captured_by: p?.captured_by ?? '',
    confidence: p?.confidence ?? '',
    licence_seen_at: day(p?.licence_seen_at ?? null),
    tin_checked_at: day(p?.tin_checked_at ?? null),
    site_visit_at: day(p?.site_visit_at ?? null),
    verified_by: p?.verified_by ?? '',
    reverify_by: p?.reverify_by ?? '',
    notes: p?.notes ?? '',
  }
}

/** HagerLand's private supply record for an organisation (blueprint Phase 1a). Never shown outside the admin. */
export function SupplyPartnerPanel({
  orgId,
  partner,
  contacts,
  evidence,
  duplicates,
  prices,
}: {
  orgId: string
  partner: SupplyPartnerView | null
  contacts: SupplyContactView[]
  evidence: { path: string; url: string | null }[]
  duplicates: { id: string; name: string; status: string; reason: string }[]
  prices: { current: number; expiringSoon: number; expired: number }
}) {
  // The status picked but not saved yet (null: the saved one). "Change status" and "Save supply record" both save it.
  const [chosen, setChosen] = useState<string | null>(null)
  const saved = partner?.relationship_status ?? ''
  const status = chosen ?? saved
  // Once the page shows the saved status, the pick is no longer pending.
  useEffect(() => setChosen((c) => (c === saved ? null : c)), [saved])
  return (
    <div className="space-y-6">
      <p className="text-small text-muted">Private to HagerLand: never shown on the site, to customers or to the business itself.</p>
      {!partner && <Duplicates duplicates={duplicates} />}
      {partner && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-stone-50 px-3 py-2 text-small">
          <span className="font-semibold">
            Prices: {prices.current} current · {prices.expiringSoon} expiring within 7 days · {prices.expired} expired
          </span>
          <Link href={`/roodber8/supply/partners/${orgId}/offers`} prefetch={false} className="font-semibold text-green underline">
            Open price list
          </Link>
        </p>
      )}
      {partner && <StatusControl orgId={orgId} status={partner.relationship_status} changedAt={partner.status_changed_at} value={status} setValue={setChosen} />}
      <ProfileForm orgId={orgId} partner={partner} status={status} />
      {partner && (
        <>
          <Contacts orgId={orgId} contacts={contacts} />
          <Evidence orgId={orgId} evidence={evidence} />
        </>
      )}
    </div>
  )
}

function Duplicates({ duplicates }: { duplicates: { id: string; name: string; status: string; reason: string }[] }) {
  if (!duplicates.length) return <p className="text-small">No other organisation has the same phone number or a similar name.</p>
  return (
    <div className="rounded-md border border-gold/40 bg-gold-soft px-4 py-3 text-small text-ink">
      <p className="font-semibold">Check these first: they may be the same business</p>
      <ul className="mt-2 space-y-1">
        {duplicates.map((d) => (
          <li key={d.id}>
            <Link href={`/roodber8/organisations/${d.id}`} prefetch={false} className="font-semibold text-green underline">
              {d.name}
            </Link>{' '}
            <span className="text-muted">
              · {d.reason} · {d.status.replace(/_/g, ' ')}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2">If one is the same business, ask the owner to merge them before creating the record.</p>
    </div>
  )
}

function StatusControl({ orgId, status, changedAt, value, setValue }: { orgId: string; status: string; changedAt: string | null; value: string; setValue: (v: string) => void }) {
  const { pending, run } = useRun(`partner:${orgId}`)
  const hint = RELATIONSHIP_STATUSES.find((s) => s.value === value)?.hint
  return (
    <div className="space-y-2">
      <p className="flex flex-wrap items-center gap-2 text-small">
        <StatusBadge status={status} /> {changedAt && <span className="text-muted">since {formatDate(changedAt)}</span>}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label="Relationship status" htmlFor="sp-status" hint={hint} className="flex-1">
          <Select id="sp-status" value={value} onChange={(e) => setValue(e.target.value)}>
            {RELATIONSHIP_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Button size="md" variant="secondary" disabled={pending || value === status} onClick={() => run(() => setSupplyPartnerStatusAction(orgId, value))}>
          Change status
        </Button>
      </div>
      {value !== status && <p className="text-caption font-semibold text-gold">Unsaved status change: “Change status” or “Save supply record” saves it.</p>}
    </div>
  )
}

function ProfileForm({ orgId, partner, status }: { orgId: string; partner: SupplyPartnerView | null; status: string }) {
  const [v, setV] = useState(profileFrom(partner))
  const [aka, setAka] = useState((partner?.aka ?? []).join('\n'))
  const { pending, run } = useRun(`partner:${orgId}`)
  const version = useLatestVersion(`partner:${orgId}`, partner?.updated_at ?? '')
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })
  const save = () =>
    run(() =>
      saveSupplyPartnerAction(
        orgId,
        { ...v, aka: aka.split('\n').map((s) => s.trim()).filter(Boolean) },
        version || null,
        partner && status !== partner.relationship_status ? status : undefined,
      ),
    )
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-small font-semibold">Roles</legend>
        <div className="grid gap-1 sm:grid-cols-3">
          {SUPPLY_ROLES.map((r) => (
            <Checkbox
              key={r.value}
              id={`sp-role-${r.value}`}
              label={r.label}
              checked={v.roles.includes(r.value)}
              onChange={(e) => setV({ ...v, roles: e.target.checked ? [...v.roles, r.value] : v.roles.filter((x) => x !== r.value) })}
            />
          ))}
        </div>
      </fieldset>
      <Field label="Other names" htmlFor="sp-aka" hint="One per line: Amharic name, other English spellings, trading names. Used to find duplicates and in search.">
        <Textarea id="sp-aka" rows={3} value={aka} onChange={(e) => setAka(e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Where this information came from" htmlFor="sp-source">
          <Select id="sp-source" value={v.source} onChange={set('source')}>
            <option value="">Not recorded</option>
            {PARTNER_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Confidence" htmlFor="sp-conf">
          <Select id="sp-conf" value={v.confidence} onChange={set('confidence')}>
            <option value="">Not recorded</option>
            {CONFIDENCE_LEVELS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Recorded on" htmlFor="sp-cap-at">
          <Input id="sp-cap-at" type="date" value={v.captured_at} onChange={set('captured_at')} />
        </Field>
        <Field label="Recorded by" htmlFor="sp-cap-by">
          <Input id="sp-cap-by" value={v.captured_by} onChange={set('captured_by')} maxLength={120} />
        </Field>
      </div>
      <Field label="Source note" htmlFor="sp-src-note" hint="For example: “Met at their Merkato shop”, “Referred by a contractor we work with”.">
        <Input id="sp-src-note" value={v.source_note} onChange={set('source_note')} maxLength={500} />
      </Field>
      <fieldset className="space-y-4">
        <legend className="text-small font-semibold">Verification</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Trade licence seen" htmlFor="sp-lic">
            <Input id="sp-lic" type="date" value={v.licence_seen_at} onChange={set('licence_seen_at')} />
          </Field>
          <Field label="TIN checked" htmlFor="sp-tin">
            <Input id="sp-tin" type="date" value={v.tin_checked_at} onChange={set('tin_checked_at')} />
          </Field>
          <Field label="Site visit" htmlFor="sp-visit">
            <Input id="sp-visit" type="date" value={v.site_visit_at} onChange={set('site_visit_at')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Verified by" htmlFor="sp-vby" hint="Left empty: your admin name, once a date is set.">
            <Input id="sp-vby" value={v.verified_by} onChange={set('verified_by')} maxLength={120} />
          </Field>
          <Field label="Re-verify by" htmlFor="sp-rev" hint={`Left empty: ${REVERIFY_MONTHS} months after the latest date above.`}>
            <Input id="sp-rev" type="date" value={v.reverify_by} onChange={set('reverify_by')} />
          </Field>
        </div>
        <p className="text-caption text-muted">The licence number and TIN themselves are in “HagerLand-only fields”.</p>
      </fieldset>
      <Field label="Notes" htmlFor="sp-notes">
        <Textarea id="sp-notes" rows={3} value={v.notes} onChange={set('notes')} maxLength={4000} />
      </Field>
      <Button onClick={save} disabled={pending}>
        {partner ? 'Save supply record' : 'Create supply partner record'}
      </Button>
    </div>
  )
}

const emptyContact: SupplyContactInput = { id: '', name: '', role: '', phone: '', whatsapp: '', telegram: '', preferred_channel: '', email: '', consent_basis: '', consent_note: '', do_not_contact: false, last_contacted_at: '' }

function contactFrom(c: SupplyContactView): SupplyContactInput {
  return {
    id: c.id,
    name: c.name,
    role: c.role ?? '',
    phone: c.phone ?? '',
    whatsapp: c.whatsapp ?? '',
    telegram: c.telegram ?? '',
    preferred_channel: c.preferred_channel ?? '',
    email: c.email ?? '',
    consent_basis: c.consent_basis ?? '',
    consent_note: c.consent_note ?? '',
    do_not_contact: c.do_not_contact,
    last_contacted_at: day(c.last_contacted_at),
  }
}

function Contacts({ orgId, contacts }: { orgId: string; contacts: SupplyContactView[] }) {
  const [editing, setEditing] = useState<SupplyContactInput | null>(null)
  const { pending, run } = useRun()
  return (
    <section className="space-y-3">
      <h3 className="text-small font-semibold">Contacts ({contacts.length})</h3>
      {contacts.length === 0 && <p className="text-small text-muted">No contacts yet. Add the person you speak to, with their phone first.</p>}
      <ul className="space-y-2">
        {contacts.map((c) => (
          <li key={c.id} className={`rounded-md border p-3 text-small ${c.do_not_contact ? 'border-error bg-error/5' : 'border-border'}`}>
            {c.do_not_contact && <p className="mb-1 font-semibold uppercase text-error">Do not contact</p>}
            <p className="font-semibold">
              {c.name}
              {c.role && <span className="font-normal text-muted"> · {c.role}</span>}
            </p>
            <p>
              <SupplyContactLinks phone={c.phone_normalised ?? c.phone} whatsapp={c.whatsapp} telegram={c.telegram} email={c.email} />
            </p>
            <p className="text-muted">
              {[c.preferred_channel && `Prefers ${labelFor(CONTACT_CHANNELS, c.preferred_channel).toLowerCase()}`, c.consent_basis && labelFor(CONSENT_BASES, c.consent_basis), c.last_contacted_at && `last contacted ${formatDate(c.last_contacted_at)}`].filter(Boolean).join(' · ')}
            </p>
            <div className="mt-2 flex gap-3">
              <button type="button" className="min-h-9 font-semibold text-green" onClick={() => setEditing(contactFrom(c))}>
                Edit
              </button>
              <button type="button" className="min-h-9 font-semibold text-error" disabled={pending} onClick={() => window.confirm(`Remove ${c.name}?`) && run(() => removeSupplyContactAction(orgId, c.id))}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      {editing ? (
        <ContactForm key={editing.id || 'new'} orgId={orgId} initial={editing} onDone={() => setEditing(null)} />
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setEditing(emptyContact)}>
          Add contact
        </Button>
      )}
    </section>
  )
}

function ContactForm({ orgId, initial, onDone }: { orgId: string; initial: SupplyContactInput; onDone: () => void }) {
  const [c, setC] = useState(initial)
  const { pending, run } = useRun()
  const set = (k: keyof typeof c) => (e: { target: { value: string } }) => setC({ ...c, [k]: e.target.value })
  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="sc-name" required>
          <Input id="sc-name" value={c.name} onChange={set('name')} maxLength={120} />
        </Field>
        <Field label="Role" htmlFor="sc-role" hint="Owner, manager, sales…">
          <Input id="sc-role" value={c.role} onChange={set('role')} maxLength={80} />
        </Field>
        <Field label="Phone" htmlFor="sc-phone" hint="09…, 011… or +251…">
          <Input id="sc-phone" type="tel" value={c.phone} onChange={set('phone')} maxLength={32} />
        </Field>
        <Field label="WhatsApp" htmlFor="sc-wa">
          <Input id="sc-wa" type="tel" value={c.whatsapp} onChange={set('whatsapp')} maxLength={32} />
        </Field>
        <Field label="Telegram" htmlFor="sc-tg" hint="Username or number">
          <Input id="sc-tg" value={c.telegram} onChange={set('telegram')} maxLength={64} />
        </Field>
        <Field label="Email" htmlFor="sc-email">
          <Input id="sc-email" type="email" value={c.email} onChange={set('email')} maxLength={254} />
        </Field>
        <Field label="Preferred channel" htmlFor="sc-pref">
          <Select id="sc-pref" value={c.preferred_channel} onChange={set('preferred_channel')}>
            <option value="">Not known</option>
            {CONTACT_CHANNELS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Last contacted" htmlFor="sc-last">
          <Input id="sc-last" type="date" value={c.last_contacted_at} onChange={set('last_contacted_at')} />
        </Field>
        <Field label="Why we may contact them" htmlFor="sc-consent">
          <Select id="sc-consent" value={c.consent_basis} onChange={set('consent_basis')}>
            <option value="">Not recorded</option>
            {CONSENT_BASES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Consent note" htmlFor="sc-cnote">
          <Input id="sc-cnote" value={c.consent_note} onChange={set('consent_note')} maxLength={500} />
        </Field>
      </div>
      <Checkbox id="sc-dnc" label="Do not contact (they asked us not to)" checked={c.do_not_contact} onChange={(e) => setC({ ...c, do_not_contact: e.target.checked })} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" disabled={pending || !c.name.trim()} onClick={() => run(() => saveSupplyContactAction(orgId, c), onDone)}>
          {c.id ? 'Save contact' : 'Add contact'}
        </Button>
        <Button className="flex-1" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function Evidence({ orgId, evidence }: { orgId: string; evidence: { path: string; url: string | null }[] }) {
  const { pending, run } = useRun()
  return (
    <section className="space-y-3">
      <h3 className="text-small font-semibold">Evidence ({evidence.length})</h3>
      {evidence.length > 0 && (
        <ul className="space-y-2">
          {evidence.map((e, i) => (
            <li key={e.path} className="flex flex-wrap items-center gap-3 text-small">
              {e.url ? (
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 font-semibold text-green underline">
                  <FileText className="size-4" aria-hidden /> Evidence {i + 1}
                </a>
              ) : (
                <span className="text-muted">Evidence {i + 1} (unavailable)</span>
              )}
              <button type="button" className="min-h-9 font-semibold text-error" disabled={pending} onClick={() => window.confirm('Remove this file from the record?') && run(() => removeSupplyEvidenceAction(orgId, e.path))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <FileDrop
        target={{ purpose: 'private', area: 'supply', id: orgId }}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        label="Add licence, TIN or shop photos"
        hint="Photos or PDF. Private: links work for 10 minutes."
        onDocUploaded={(doc) => run(() => addSupplyEvidenceAction(orgId, doc.path))}
      />
    </section>
  )
}
