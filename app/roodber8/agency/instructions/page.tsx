import Link from 'next/link'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { createInstructionAction } from '@/app/roodber8/actions/agency'
import { INSTRUCTION_STAGES, STAGE_LABEL, type InstructionStage } from '@/lib/agency'
import { PROPERTY_TYPES } from '@/lib/labels'
import { formatDate, formatETB } from '@/lib/format'
import { AdminHeader, DataTable, FilterBar, FilterField, Panel, filterInput } from '@/components/admin/AdminUi'
import { ActionForm } from '@/components/forms/ActionForm'
import { Field, Input, Select } from '@/components/ui/Field'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Instructions' }

/** The instructions pipeline: lead → valuation → instructed → live → under offer / let agreed → completed (spec 26.5). */
export default async function InstructionsPage(props: { searchParams: Promise<{ stage?: string; purpose?: string }> }) {
  const sp = await props.searchParams
  const stage = INSTRUCTION_STAGES.find((s) => s === sp.stage)
  const purpose = sp.purpose === 'sale' || sp.purpose === 'rent' ? sp.purpose : undefined
  let q = getAdminSupabase().from('agency_instructions').select('id, reference, title, purpose, stage, asking_price_etb, assigned_agent, updated_at, contact:agency_contacts(name)').order('updated_at', { ascending: false }).limit(300)
  if (stage) q = q.eq('stage', stage)
  if (purpose) q = q.eq('purpose', purpose)
  const { data } = must(await q)
  return (
    <div className="space-y-5">
      <AdminHeader title="Instructions" description="Every property HagerLand sells or lets, from first contact to completion." />
      <FilterBar action="/roodber8/agency/instructions">
        <FilterField label="Stage">
          <select name="stage" defaultValue={stage ?? ''} className={`${filterInput} h-10`}>
            <option value="">All</option>
            {INSTRUCTION_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Type">
          <select name="purpose" defaultValue={purpose ?? ''} className={`${filterInput} h-10`}>
            <option value="">Sales and lettings</option>
            <option value="sale">Sales</option>
            <option value="rent">Lettings</option>
          </select>
        </FilterField>
      </FilterBar>
      <DataTable
        label="Instructions"
        rows={data ?? []}
        rowKey={(r) => r.id}
        empty="No instructions here yet. Valuation requests create a lead automatically."
        columns={[
          { key: 'ref', label: 'Reference', render: (r) => <Link href={`/roodber8/agency/instructions/${r.id}`} prefetch={false} className="font-semibold text-green hover:underline">{r.reference}</Link> },
          { key: 'title', label: 'Property', render: (r) => r.title },
          { key: 'who', label: 'Client', render: (r) => (Array.isArray(r.contact) ? r.contact[0]?.name : r.contact?.name) ?? '' },
          { key: 'type', label: 'Type', render: (r) => (r.purpose === 'sale' ? 'Sale' : 'Letting') },
          { key: 'stage', label: 'Stage', render: (r) => STAGE_LABEL[r.stage as InstructionStage] },
          { key: 'price', label: 'Asking', render: (r) => (r.asking_price_etb ? formatETB(r.asking_price_etb) : '') },
          { key: 'agent', label: 'Agent', render: (r) => r.assigned_agent ?? '' },
          { key: 'updated', label: 'Updated', render: (r) => formatDate(r.updated_at) },
        ]}
      />
      <Panel title="New instruction">
        <ActionForm action={createInstructionAction} submitLabel="Create instruction">
          <Field label="Title" htmlFor="ni-title" hint="e.g. 3-bed apartment, Bole Atlas">
            <Input id="ni-title" name="title" maxLength={160} />
          </Field>
          <Field label="Sale or letting" htmlFor="ni-purpose">
            <Select id="ni-purpose" name="purpose" defaultValue="sale">
              <option value="sale">Sale</option>
              <option value="rent">Letting</option>
            </Select>
          </Field>
          <Field label="Property type" htmlFor="ni-type" optional>
            <Select id="ni-type" name="property_type" defaultValue="">
              <option value="">Not set</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Agent" htmlFor="ni-agent" optional>
            <Input id="ni-agent" name="assigned_agent" maxLength={120} />
          </Field>
          <Field label="Address" htmlFor="ni-addr" optional className="sm:col-span-2">
            <Input id="ni-addr" name="address_line" maxLength={300} />
          </Field>
        </ActionForm>
      </Panel>
    </div>
  )
}
