import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { SOCIAL_KEYS } from '@/lib/brand'
import { LEGAL_WRITTEN } from '@/lib/content/legal'
import { formatDate } from '@/lib/format'
import { LICENCE_KINDS, LICENCE_LABELS } from '@/lib/validation/settings'
import { integrationStatuses } from '@/lib/integrations'
import { AdminHeader, Panel } from '@/components/admin/AdminUi'
import { ClaimsEditor, SettingsForm } from './SettingsForm'

export const metadata = { title: 'Settings' }

const SOCIAL_LABEL: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', tiktok: 'TikTok', youtube: 'YouTube', x: 'X (Twitter)', telegram: 'Telegram channel' }

export default async function SettingsPage() {
  await requireAdminPage()
  const db = getAdminSupabase()
  const { data } = await db.from('site_settings').select('key, value')
  const s = Object.fromEntries((data ?? []).map((r) => [r.key, r.value])) as Record<string, unknown>
  const o = (k: string) => (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) ? (s[k] as Record<string, unknown>) : {})
  const v = (x: unknown) => (x === null || x === undefined ? '' : String(x))
  const contact = o('contact_details')
  const social = o('social_links')
  const legal = o('legal_entity')
  const ann = o('announcement_bar')
  const dates = o('legal_last_updated')
  const claims = (Array.isArray(s.developments_claims) ? s.developments_claims : []).map((c) => ({ title: v((c as Record<string, unknown>)?.title), text: v((c as Record<string, unknown>)?.text) }))
  const pickIds = Array.isArray(s.homepage_featured_ids) ? (s.homepage_featured_ids as string[]) : []
  const { data: picks } = pickIds.length ? await db.from('properties').select('id, short_id').in('id', pickIds) : { data: [] }
  const pickText = pickIds.map((id) => picks?.find((p) => p.id === id)?.short_id).filter(Boolean).join('\n')
  return (
    <div className="max-w-4xl space-y-5">
      <AdminHeader title="Settings" description="Business details shown on the website. Anything left empty is hidden from visitors, so nothing half-finished ever shows." />
      <Panel title="Contact details">
        <SettingsForm
          section="contact"
          fields={[
            { name: 'phone', label: 'Main phone', value: v(contact.phone), placeholder: '0911 234 567', hint: 'Shown in the footer and on the contact page.' },
            { name: 'whatsapp', label: 'WhatsApp number', value: v(contact.whatsapp), placeholder: '0911 234 567' },
            { name: 'telegram', label: 'Telegram username', value: v(contact.telegram), placeholder: '@hagerland' },
            { name: 'email', label: 'Main email', type: 'email', value: v(contact.email), placeholder: 'hello@hagerland.com', hint: 'Also receives contact-form and general enquiries.' },
            { name: 'supply_email', label: 'HagerLand Supply email', type: 'email', value: v(contact.supply_email), hint: 'Receives quote requests. Uses the main email if empty.' },
            { name: 'hours', label: 'Opening hours', value: v(contact.hours), placeholder: 'Mon–Sat, 8:30–17:30' },
            { name: 'address', label: 'Office address', type: 'textarea', value: v(contact.address) },
          ]}
        />
      </Panel>
      <Panel title="Licences and approvals">
        <p className="mb-3 text-small text-muted">
          AB confirmed on 15 Oct 2026 that HagerLand&rsquo;s approval covers estate agency, property management (including collecting and holding rent for owners), recruitment and placement, and finance and insurance introductions. Record each licence or approval reference here. Once a number is filled in it is shown on the matching pages (estate agency also in the footer and the terms); empty ones stay hidden.
        </p>
        <SettingsForm
          section="licences"
          fields={LICENCE_KINDS.flatMap((k) => {
            const l = (o('licences')[k] ?? {}) as Record<string, unknown>
            return [
              { name: `${k}_number`, label: `${LICENCE_LABELS[k]}: licence or approval number`, value: v(l.number) },
              { name: `${k}_authority`, label: 'Issuing authority', value: v(l.authority) },
              { name: `${k}_holder`, label: 'Licence holder (legal entity)', value: v(l.holder) },
              { name: `${k}_date`, label: 'Date issued', type: 'date' as const, value: v(l.date) },
            ]
          })}
        />
      </Panel>
      <Panel title="Social media">
        <SettingsForm section="social" fields={SOCIAL_KEYS.map((k) => ({ name: k, label: SOCIAL_LABEL[k] ?? k, type: 'url' as const, value: v(social[k]), placeholder: 'https://…' }))} />
      </Panel>
      <Panel title="Legal entity">
        <SettingsForm
          section="legal"
          fields={[
            { name: 'name', label: 'Registered company name', value: v(legal.name), hint: 'Shown in the footer and legal pages once filled in.' },
            { name: 'registration_number', label: 'Registration number', value: v(legal.registration_number) },
            { name: 'governing_law', label: 'Governing law clause', value: v(legal.governing_law), placeholder: 'the laws of the Federal Democratic Republic of Ethiopia', hint: 'Added to the terms only when filled in. Confirm with your lawyer.' },
            { name: 'address', label: 'Registered address', type: 'textarea', value: v(legal.address) },
          ]}
        />
      </Panel>
      <Panel title="Business promises">
        <SettingsForm
          section="business"
          fields={[
            { name: 'free_listing_confirmed', label: 'Listing is free', type: 'checkbox', value: s.free_listing_confirmed === true ? 'true' : '', hint: 'Turn on only when you are sure. Pages then say listing is free.' },
            { name: 'delivery_area', label: 'HagerLand Supply delivery area', value: v(s.delivery_area), placeholder: 'Addis Ababa and surrounding areas', hint: 'Shown on supplies pages when set.' },
            { name: 'quote_response_target', label: 'Quote reply time', value: v(s.quote_response_target), placeholder: 'within one business day', hint: 'Completes the sentence “We reply …”.' },
            { name: 'property_care_pricing', label: 'Property Care prices', type: 'textarea', value: v(s.property_care_pricing), hint: 'Shown on the Property Care page only when filled in. Leave empty to show no prices.' },
          ]}
        >
          <ClaimsEditor initial={claims} />
        </SettingsForm>
      </Panel>
      <Panel title="Announcement bar">
        <SettingsForm
          section="announcement"
          fields={[
            { name: 'enabled', label: 'Show the announcement bar', type: 'checkbox', value: ann.enabled === true ? 'true' : '' },
            { name: 'text', label: 'Text', value: v(ann.text), hint: 'Up to 160 characters.' },
            { name: 'href', label: 'Link', value: v(ann.href), placeholder: '/supplies', hint: 'Optional. A page path or a full https:// link.' },
          ]}
        />
      </Panel>
      <Panel title="Homepage picks">
        <SettingsForm
          section="homepage"
          fields={[{ name: 'picks', label: 'Properties to show first in “Latest properties”', type: 'textarea', value: pickText, hint: 'One 8-character property reference (or property link) per line, up to 12. Only live properties.' }]}
        />
      </Panel>
      <Panel title="Rules and thresholds">
        <SettingsForm
          section="thresholds"
          fields={[
            { name: 'listing_expiry_days', label: 'Listings expire after (days)', type: 'number', value: v(s.listing_expiry_days ?? 60) },
            { name: 'private_owner_max_active_listings', label: 'Private owner listing limit', type: 'number', value: v(s.private_owner_max_active_listings ?? 3) },
            { name: 'min_results_for_index', label: 'Minimum results before a search page is shown to Google', type: 'number', value: v(s.min_results_for_index ?? 3) },
            { name: 'verified_business_count_min', label: 'Show “verified businesses” count from', type: 'number', value: v(s.verified_business_count_min ?? 25), hint: 'The homepage shows the number only once it reaches this.' },
          ]}
        />
      </Panel>
      <div id="gates">
        <Panel title="Stage gates (Pillars and modes)">
          <SettingsForm
            section="gates"
            fields={[
              { name: 'stage_gate_min_providers', label: 'Verified providers or partners needed before Aggregate can be switched on', type: 'number', value: v(s.stage_gate_min_providers ?? 3) },
              { name: 'regulatory_clearance_note', label: 'Pre-filled regulatory clearance note', value: v(s.regulatory_clearance_note), hint: 'Appears in every stage-gate checklist; you can still edit it there.' },
            ]}
          />
        </Panel>
      </div>
      <Panel title="Estate agency and market insight">
        <SettingsForm
          section="agency"
          fields={[
            { name: 'agency_fee_schedule', label: 'Published agency fee schedule', type: 'textarea', value: v(s.agency_fee_schedule), hint: 'Leave empty to say “fees are agreed in writing” on agency pages. Shown exactly as written.' },
            { name: 'market_insight_min_sample', label: 'Minimum listings before a market-insight figure is shown', type: 'number', value: v(s.market_insight_min_sample ?? 5) },
          ]}
        />
      </Panel>
      <Panel title="Integrations">
        <p className="mb-3 text-small text-muted">Services that need a contract with an outside provider. They are prepared in the code and switched off until you choose a provider.</p>
        <ul className="divide-y divide-border text-small">
          {integrationStatuses().map((i) => (
            <li key={i.key} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="font-semibold text-ink">{i.name}</span>
                <span className="block text-muted">{i.note}</span>
              </span>
              <span className="text-caption font-semibold text-muted">{i.configured ? 'Connected' : 'Not configured'}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Amharic (አማርኛ)">
        <p className="mb-3 text-small text-muted">
          The Amharic version of the site (addresses starting with /am) uses a machine-assisted translation of menus, buttons and main headings. It needs a review by a native speaker before it goes live. While this is off, /am pages do not exist and nothing links to them.
        </p>
        <SettingsForm section="language" fields={[{ name: 'amharic_enabled', label: 'Show the Amharic version', type: 'checkbox', value: s.amharic_enabled === true ? 'true' : '', hint: 'Turn on only after the translation has been reviewed. Updates within a minute.' }]} />
      </Panel>
      <Panel title="Legal pages “last updated” dates">
        <SettingsForm
          section="legal_dates"
          fields={(['terms', 'privacy', 'cookies'] as const).map((k) => ({ name: k, label: k[0].toUpperCase() + k.slice(1), type: 'date' as const, value: v(dates[k]), hint: `Leave empty to show ${formatDate(LEGAL_WRITTEN[k])}.` }))}
        />
      </Panel>
    </div>
  )
}
