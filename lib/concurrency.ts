import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'

/** Shown when two people edit the same record at once (spec 25.4): the second save is refused, not silently merged. */
export const STALE_EDIT = 'Someone else changed this since you opened it. Reload the page to see their changes, then make yours again.'

type Versioned = 'properties' | 'developments' | 'organisations' | 'products'

/**
 * True when the record changed after the form was opened. Forms send the record's updated_at as
 * "expected_updated_at"; a missing value (e.g. a new record) never counts as stale.
 */
export async function isStaleEdit(table: Versioned, id: string, expected: FormDataEntryValue | null): Promise<boolean> {
  if (typeof expected !== 'string' || !expected) return false
  const { data } = await getAdminSupabase().from(table).select('updated_at').eq('id', id).maybeSingle()
  if (!data) return false
  return new Date(data.updated_at).getTime() !== new Date(expected).getTime()
}
