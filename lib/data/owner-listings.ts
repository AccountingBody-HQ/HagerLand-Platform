import 'server-only'
import type { Database } from '@/lib/database.types'
import { getServerSupabase } from '@/lib/supabase/server'
import { getLocationById } from '@/lib/data/reference'
import type { WizardValues } from '@/components/account/ListingWizard'
import type { MediaItem } from '@/lib/media-actions'

export type PropertyRow = Database['public']['Tables']['properties']['Row']

/** The owner's view of a listing: saved values with any pending (unreviewed) changes applied. */
export async function loadOwnerListing(id: string): Promise<{ row: PropertyRow; merged: PropertyRow; media: MediaItem[]; values: WizardValues } | null> {
  const supabase = getServerSupabase()
  const { data: row } = await supabase.from('properties').select('*').eq('id', id).maybeSingle()
  if (!row) return null
  const merged = { ...row, ...((row.pending_changes as Partial<PropertyRow> | null) ?? {}) } as PropertyRow
  const { data: media } = await supabase.from('media').select('id, kind, storage_path, thumb_path, width, height, alt, sort, is_cover, status').eq('entity_type', 'property').eq('entity_id', id).order('sort')
  const loc = await getLocationById(merged.location_id)
  return {
    row,
    merged,
    media: (media ?? []) as MediaItem[],
    values: {
      ...merged,
      area_m2: merged.area_m2 === null ? null : Number(merged.area_m2),
      plot_area_m2: merged.plot_area_m2 === null ? null : Number(merged.plot_area_m2),
      location: loc ? { value: loc.id, label: loc.name, description: loc.display_name } : null,
    },
  }
}
