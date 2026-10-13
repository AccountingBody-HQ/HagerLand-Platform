import 'server-only'
import { getServerSupabase } from '@/lib/supabase/server'
import { getLocationById } from '@/lib/data/reference'
import { parseUnitTypes } from '@/lib/data/developments'
import type { DevelopmentDefaults } from '@/components/account/DevelopmentForm'
import type { Database } from '@/lib/database.types'

type DevRow = Database['public']['Tables']['developments']['Row']

export async function loadOwnerDevelopment(id: string): Promise<{ row: DevRow; defaults: DevelopmentDefaults } | null> {
  const { data: row } = await getServerSupabase().from('developments').select('*').eq('id', id).maybeSingle()
  if (!row) return null
  const v = { ...row, ...((row.pending_changes as Partial<DevRow> | null) ?? {}) } as DevRow
  const loc = await getLocationById(v.location_id)
  return {
    row,
    defaults: {
      ...v,
      location: loc ? { value: loc.id, label: loc.name, description: loc.display_name } : null,
      unit_types: parseUnitTypes(v.unit_types),
      price_from_etb: v.price_from_etb,
      price_to_etb: v.price_to_etb,
    },
  }
}

/** Developments the signed-in user's organisations own (RLS-scoped), for linking unit listings. */
export async function getOwnDevelopments(): Promise<{ id: string; name: string }[]> {
  const { data } = await getServerSupabase().from('developments').select('id, name').neq('status', 'archived').order('name')
  return data ?? []
}
