import { MapPin } from 'lucide-react'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { getLocationById } from '@/lib/data/reference'
import { deleteBranchAction, saveBranchAction } from '@/app/actions/team-actions'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { Card, EmptyState } from '@/components/ui/Layout'
import { Combobox } from '@/components/ui/Combobox'
import { Input } from '@/components/ui/Field'
import { ActionForm } from '@/components/forms/ActionForm'
import { ActionButton } from '@/components/forms/ActionButton'

export const metadata = { title: 'Branches' }

function BranchFields({ id, defaults }: { id: string; defaults?: { name: string; location: { value: string; label: string } | null; address_line: string | null; opening_note: string | null } }) {
  return (
    <>
      <label className="grid gap-1 text-small font-semibold">
        Branch name
        <Input name="name" defaultValue={defaults?.name} maxLength={120} required placeholder="e.g. Bole office" />
      </label>
      <label className="grid gap-1 text-small font-semibold" htmlFor={`br-loc-${id}`}>
        Place
        <Combobox id={`br-loc-${id}`} name="location_id" endpoint="/api/locations?scope=all" defaultValue={defaults?.location ?? null} />
      </label>
      <label className="grid gap-1 text-small font-semibold">
        Address
        <Input name="address_line" defaultValue={defaults?.address_line ?? ''} maxLength={200} />
      </label>
      <label className="grid gap-1 text-small font-semibold">
        Opening hours or note
        <Input name="opening_note" defaultValue={defaults?.opening_note ?? ''} maxLength={200} placeholder="e.g. Mon–Sat 8:30–17:30" />
      </label>
    </>
  )
}

/** Branches of an agency or company, shown on its public profile (spec 25.2i). */
export default async function BranchesPage() {
  await requireUser('/account/company/branches')
  const active = await getActiveMembership()
  if (!active) return <EmptyState icon={<MapPin />} title="Branches are for business accounts" />
  const manager = active.role === 'owner' || active.role === 'admin'
  const { data } = await getServerSupabase().from('org_branches').select('*').eq('org_id', active.org.id).order('sort').order('created_at')
  const branches = await Promise.all((data ?? []).map(async (b) => ({ ...b, loc: await getLocationById(b.location_id) })))
  return (
    <div className="space-y-6">
      <AccountPageHeader title="Branches" description="Other offices of your business. They appear on your public profile with their place and address; customers still contact you through your profile." />
      {branches.map((b) => (
        <Card key={b.id} className="p-5 sm:p-6">
          {manager ? (
            <>
              <ActionForm action={saveBranchAction} submitLabel="Save branch" resetOnSuccess={false}>
                <input type="hidden" name="id" value={b.id} />
                <BranchFields id={b.id} defaults={{ name: b.name, location: b.loc ? { value: b.loc.id, label: b.loc.display_name } : null, address_line: b.address_line, opening_note: b.opening_note }} />
              </ActionForm>
              <ActionButton size="sm" variant="ghost" className="mt-2" confirm={`Remove ${b.name}?`} action={deleteBranchAction.bind(null, b.id)}>
                Remove branch
              </ActionButton>
            </>
          ) : (
            <p>
              <strong>{b.name}</strong> · {b.loc?.display_name}
            </p>
          )}
        </Card>
      ))}
      {manager && (
        <Card className="p-5 sm:p-6">
          <h2 className="hl-h3 mb-4">Add a branch</h2>
          <ActionForm action={saveBranchAction} submitLabel="Add branch">
            <BranchFields id="new" />
          </ActionForm>
        </Card>
      )}
    </div>
  )
}
