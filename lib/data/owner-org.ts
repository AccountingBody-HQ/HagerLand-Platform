import 'server-only'
import type { Database } from '@/lib/database.types'
import { getServerSupabase } from '@/lib/supabase/server'
import { getActiveMembership, type Membership } from '@/lib/auth'
import { getLocationById, getLocations } from '@/lib/data/reference'
import type { OrgFormDefaults } from '@/components/account/OrganisationForm'

export type OrgRow = Database['public']['Tables']['organisations']['Row']

/** The active organisation (owner/admin view) with its form defaults, or null. */
export async function loadActiveOrg(): Promise<{ membership: Membership; org: OrgRow; defaults: OrgFormDefaults } | null> {
  const membership = await getActiveMembership()
  if (!membership) return null
  const supabase = getServerSupabase()
  const { data: org } = await supabase.from('organisations').select('*').eq('id', membership.org.id).maybeSingle()
  if (!org) return null
  const values = { ...org, ...((org.pending_changes as Partial<OrgRow> | null) ?? {}) } as OrgRow
  const [{ data: services }, { data: cats }, loc, all] = await Promise.all([
    supabase.from('organisation_services').select('service_id').eq('org_id', org.id),
    supabase.from('org_product_categories').select('product_category_id').eq('org_id', org.id),
    getLocationById(values.location_id),
    getLocations(),
  ])
  const areas = (values.areas_served ?? []).map((id) => all.find((l) => l.id === id)).filter((l): l is NonNullable<typeof l> => Boolean(l))
  return {
    membership,
    org,
    defaults: {
      ...values,
      location: loc ? { value: loc.id, label: loc.name, description: loc.display_name } : null,
      areas: areas.map((l) => ({ value: l.id, label: l.name })),
      service_ids: (services ?? []).map((s) => s.service_id),
      product_category_ids: (cats ?? []).map((c) => c.product_category_id),
    },
  }
}
