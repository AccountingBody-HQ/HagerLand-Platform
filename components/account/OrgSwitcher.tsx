import { setActiveOrgAction } from '@/app/(account)/account/company/org-actions'
import type { Membership } from '@/lib/auth'

/** Lets a user who belongs to several organisations choose which one they are working as. */
export function OrgSwitcher({ memberships, activeId }: { memberships: Membership[]; activeId: string | null }) {
  if (memberships.length < 2) return null
  return (
    <form action={setActiveOrgAction} className="flex items-center gap-2">
      <input type="hidden" name="return_to" value="/account" />
      <label htmlFor="org-switch" className="sr-only">
        Working as
      </label>
      <select id="org-switch" name="org_id" defaultValue={activeId ?? undefined} className="h-11 min-w-0 flex-1 rounded-sm border border-border-strong bg-white px-3 text-small">
        {memberships.map((m) => (
          <option key={m.org.id} value={m.org.id}>
            {m.org.name}
          </option>
        ))}
      </select>
      <button type="submit" className="h-11 rounded-md border border-border-strong px-3 text-small font-semibold">
        Switch
      </button>
    </form>
  )
}
