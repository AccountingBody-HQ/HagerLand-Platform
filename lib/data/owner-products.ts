import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getProductCategories } from './reference'

/** Category and brand choices for the supplier product form. */
export async function ownerProductOptions(): Promise<{ categories: { id: string; label: string }[]; brands: { id: string; name: string }[] }> {
  const [tree, { data: brands }] = await Promise.all([getProductCategories(), getAdminSupabase().from('brands').select('id, name').eq('is_active', true).order('name')])
  return {
    categories: tree.flatMap((root) => [{ id: root.id, label: root.name }, ...root.children.map((c) => ({ id: c.id, label: `${root.name} › ${c.name}` }))]),
    brands: brands ?? [],
  }
}
