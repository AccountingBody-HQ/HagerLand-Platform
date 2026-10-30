'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addMemberAction, mergeOrganisationsAction, removeMemberAction, saveOrgAdminFieldsAction, searchMergeTargetsAction, setOrganisationVisibilityAction } from '@/app/roodber8/actions/organisations'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

type Result = { ok: true; data: { message: string } } | { ok: false; error: string }

function useRun() {
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  return {
    pending,
    run: (fn: () => Promise<Result>) =>
      start(async () => {
        const res = await fn()
        toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
        if (res.ok) router.refresh()
      }),
  }
}

export function OrgAdminFields({ orgId, initial }: { orgId: string; initial: { verification_level: 'listed' | 'claimed' | 'verified'; trade_licence_number: string; tin: string; plan: string } }) {
  const [v, setV] = useState(initial)
  const { pending, run } = useRun()
  return (
    <div className="space-y-3">
      <Field label="Verification level" htmlFor="oa-ver" hint="The Verified badge is given with “Record verification check” and removed with “Revoke badge”.">
        <Select id="oa-ver" value={v.verification_level} disabled={initial.verification_level === 'verified'} onChange={(e) => setV({ ...v, verification_level: e.target.value as typeof v.verification_level })}>
          <option value="listed">Listed</option>
          <option value="claimed">Claimed</option>
          <option value="verified" disabled={initial.verification_level !== 'verified'}>
            Verified
          </option>
        </Select>
      </Field>
      <Field label="Trade licence number" htmlFor="oa-tl">
        <Input id="oa-tl" value={v.trade_licence_number} onChange={(e) => setV({ ...v, trade_licence_number: e.target.value })} />
      </Field>
      <Field label="TIN" htmlFor="oa-tin">
        <Input id="oa-tin" value={v.tin} onChange={(e) => setV({ ...v, tin: e.target.value })} />
      </Field>
      <Field label="Plan" htmlFor="oa-plan" hint="All plans are free at launch.">
        <Input id="oa-plan" value={v.plan} onChange={(e) => setV({ ...v, plan: e.target.value })} />
      </Field>
      <Button size="sm" disabled={pending} onClick={() => run(() => saveOrgAdminFieldsAction(orgId, v))}>
        Save
      </Button>
    </div>
  )
}

export function MembersTool({ orgId, members }: { orgId: string; members: { user_id: string; role: string; label: string }[] }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('owner')
  const { pending, run } = useRun()
  return (
    <div className="space-y-3">
      {members.length === 0 ? (
        <p className="text-small text-muted">No members. This profile is unclaimed.</p>
      ) : (
        <ul className="space-y-1 text-small">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {m.label} <span className="text-muted">· {m.role}</span>
              </span>
              <button type="button" className="min-h-11 shrink-0 text-caption font-semibold text-error" disabled={pending} onClick={() => run(() => removeMemberAction(orgId, m.user_id))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Input aria-label="Member email" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 min-w-0 flex-1" />
        <Select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)} className="h-9 w-28">
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
        </Select>
        <Button size="sm" variant="secondary" disabled={pending || !email} onClick={() => run(() => addMemberAction(orgId, email, role))}>
          Add
        </Button>
      </div>
    </div>
  )
}

/** QC-1a: find the organisation to merge into by name or reference (the server searches every one, at most 20 shown). */
export function MergeTool({ orgId }: { orgId: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; label: string }[] | null>(null)
  const [message, setMessage] = useState('')
  const [searching, startSearch] = useTransition()
  const [target, setTarget] = useState('')
  const [confirm, setConfirm] = useState(false)
  const { pending, run } = useRun()
  const search = () =>
    startSearch(async () => {
      const res = await searchMergeTargetsAction(orgId, query)
      setTarget('')
      if (!res.ok) {
        setResults(null)
        setMessage(res.error)
        return
      }
      setResults(res.data.results)
      setMessage(res.data.results.length ? '' : 'No organisation of this kind matches.')
    })
  return (
    <div className="space-y-3">
      <p className="text-small text-muted">Moves everything from this profile into the one you choose, then archives this one.</p>
      <div className="flex gap-2">
        <Input
          aria-label="Find the organisation to merge into"
          placeholder="Type part of a name or reference"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              search()
            }
          }}
          className="h-10 min-w-0 flex-1"
        />
        <Button size="sm" variant="secondary" disabled={searching || query.trim().length < 2} onClick={search}>
          Find
        </Button>
      </div>
      {message && <p className="text-small text-muted">{message}</p>}
      {results && results.length > 0 && (
        <Select aria-label="Merge into" value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">Merge into…</option>
          {results.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      )}
      <label className="flex items-center gap-2 text-small">
        <input type="checkbox" className="size-4 accent-green" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} /> I understand this cannot be undone automatically
      </label>
      <Button size="sm" variant="danger" disabled={pending || !target || !confirm} onClick={() => run(() => mergeOrganisationsAction(orgId, target))}>
        Merge
      </Button>
    </div>
  )
}

/**
 * Banner at the top of an organisation's admin page: is it on the public site? Private ("draft") organisations can be
 * published, published ones made private; other statuses (review, archived…) keep their own controls.
 */
export function VisibilityBanner({ orgId, status, version, isHagerland }: { orgId: string; status: string; version: string; isHagerland: boolean }) {
  const { pending, run } = useRun()
  const published = status === 'published'
  const publish = () => window.confirm('Publish only after confirming the details with the business.\n\nPublish it now with the Listed badge?') && run(() => setOrganisationVisibilityAction(orgId, 'publish', version))
  const hide = () => window.confirm('Make it private? It disappears from the public site, search and sitemaps.') && run(() => setOrganisationVisibilityAction(orgId, 'private', version))
  return (
    <div role="status" className={`flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${published ? 'border-green/30 bg-green-soft' : 'border-gold/40 bg-gold-soft'}`}>
      <div className="text-small text-ink">
        <p className="font-semibold">{published ? 'Published: visible on the public site.' : 'Private: not shown on the public site.'}</p>
        {status === 'draft' && <p>Publish only after confirming the details with the business.</p>}
        {published && isHagerland && <p>HagerLand’s own organisations always stay published.</p>}
        {!published && status !== 'draft' && <p>Status: {status.replace(/_/g, ' ')}. Use the Status panel to change it.</p>}
      </div>
      {status === 'draft' && (
        <Button size="sm" disabled={pending} onClick={publish}>
          Publish
        </Button>
      )}
      {published && !isHagerland && (
        <Button size="sm" variant="secondary" disabled={pending} onClick={hide}>
          Make private
        </Button>
      )}
    </div>
  )
}
