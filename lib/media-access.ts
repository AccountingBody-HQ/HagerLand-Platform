import 'server-only'
import { isAdminRequest } from '@/lib/admin-auth'
import { getUser, getMemberships } from '@/lib/auth'
import { userCanEditEntity } from '@/lib/storage'
import type { MediaEntity, PrivateArea } from '@/lib/media'
import { getServerSupabase } from '@/lib/supabase/server'

export type UploadScope =
  | { purpose: 'media'; entityType: MediaEntity; entityId: string }
  | { purpose: 'private'; area: PrivateArea; id: string }

/** Who may upload where. Admins may upload anywhere (including agency documents); guests only to their own form's folder. */
export async function canUpload(scope: UploadScope): Promise<boolean> {
  if ((await isAdminRequest())) return true
  if (scope.purpose === 'media') return (await getUser()) ? userCanEditEntity(scope.entityType, scope.entityId) : false
  switch (scope.area) {
    case 'materials':
    case 'request':
    case 'application':
      // Guests upload into a folder named by a random id their form created; the file is only linked on submit.
      return /^[0-9a-f-]{36}$/.test(scope.id)
    case 'match': {
      // Quote documents: only members of the provider the request was offered to (RLS checks membership).
      if (!(await getUser())) return false
      const { data } = await getServerSupabase().from('service_request_matches').select('id').eq('id', scope.id).maybeSingle()
      return Boolean(data)
    }
    case 'claim':
      return Boolean(await getUser())
    case 'cv':
      // CVs live in the signed-in user's own folder.
      return (await getUser())?.id === scope.id
    case 'verification':
      return (await getMemberships()).some((m) => m.org.id === scope.id && (m.role === 'owner' || m.role === 'admin'))
    case 'brochure':
      return (await getUser()) ? userCanEditEntity('development', scope.id) : false
    default:
      return false
  }
}

export function scopePrefix(scope: UploadScope): string {
  return scope.purpose === 'media' ? `${scope.entityType}/${scope.entityId}` : `${scope.area}/${scope.id}`
}
