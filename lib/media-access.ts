import 'server-only'
import { isAdminRequest } from '@/lib/admin-auth'
import { getUser, getMemberships } from '@/lib/auth'
import { userCanEditEntity } from '@/lib/storage'
import type { MediaEntity } from '@/lib/media'

export type UploadScope =
  | { purpose: 'media'; entityType: MediaEntity; entityId: string }
  | { purpose: 'private'; area: 'verification' | 'claim' | 'materials' | 'quote' | 'brochure'; id: string }

/** Who may upload where. Admins may upload anywhere; guests only to their own materials-list folder. */
export async function canUpload(scope: UploadScope): Promise<boolean> {
  if (isAdminRequest()) return true
  if (scope.purpose === 'media') return (await getUser()) ? userCanEditEntity(scope.entityType, scope.entityId) : false
  switch (scope.area) {
    case 'materials':
      return /^[0-9a-f-]{36}$/.test(scope.id)
    case 'claim':
      return Boolean(await getUser())
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
