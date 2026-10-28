import { redirect } from 'next/navigation'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSession } from '@/lib/admin-auth'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { inviteStaffAction } from '@/app/roodber8/actions/staff'
import { ROLE_LABEL, STAFF_ROLES } from '@/lib/admin/roles'
import { formatDate } from '@/lib/format'
import { AdminHeader, DataTable, Panel } from '@/components/admin/AdminUi'
import { StaffRow } from '@/components/admin/StaffTools'
import { ActionForm } from '@/components/forms/ActionForm'
import { Field, Input, Select } from '@/components/ui/Field'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Staff' }

/** Staff accounts (spec 26.15): invite, change role, disable. Owner only. */
export default async function StaffPage() {
  await requireAdminPage()
  const session = await getAdminSession()
  if (session?.kind === 'staff' && session.role !== 'owner') redirect('/roodber8?denied=1')
  const { data } = must(await getAdminSupabase().from('staff_users').select('id, name, email, role, status, totp_enrolled_at, last_login_at, created_at').order('created_at'))
  return (
    <div className="space-y-5">
      <AdminHeader title="Staff" description="Each staff member signs in with their own email, password and authenticator code, and sees only the areas of their role. Your master sign-in stays as your break-glass access. Staff accounts are separate from customer accounts." />
      <DataTable
        label="Staff"
        rows={data ?? []}
        rowKey={(r) => r.id}
        empty="No staff yet: only you have access."
        columns={[
          { key: 'name', label: 'Name', render: (r) => `${r.name} · ${r.email}` },
          { key: 'status', label: 'Status', render: (r) => (r.status === 'active' ? 'Active (two-factor on)' : r.status === 'invited' ? 'Invited' : 'Disabled') },
          { key: 'last', label: 'Last sign-in', render: (r) => (r.last_login_at ? formatDate(r.last_login_at) : '') },
          { key: 'tools', label: 'Role and access', render: (r) => <StaffRow id={r.id} role={r.role} status={r.status} name={r.name} /> },
        ]}
      />
      <Panel title="Invite a staff member">
        <ActionForm action={inviteStaffAction} submitLabel="Send invitation">
          <Field label="Name" htmlFor="st-name">
            <Input id="st-name" name="name" maxLength={120} />
          </Field>
          <Field label="Work email" htmlFor="st-email" hint="Must not already be a customer account.">
            <Input id="st-email" name="email" type="email" />
          </Field>
          <Field label="Role" htmlFor="st-role" className="sm:col-span-2">
            <Select id="st-role" name="role" defaultValue="agent">
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>
        </ActionForm>
      </Panel>
    </div>
  )
}
