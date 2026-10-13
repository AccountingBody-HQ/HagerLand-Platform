import { getProfile, requireUser } from '@/lib/auth'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { Card } from '@/components/ui/Layout'
import { DeleteAccountForm, EmailForm, ProfileForm } from '@/components/account/SettingsForms'
import { UpdatePasswordForm } from '@/components/auth/PasswordForms'
import { FormAlert } from '@/components/forms/FormParts'
import { formatDate } from '@/lib/format'

export const metadata = { title: 'Settings' }

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="hl-h3 mb-4">{title}</h2>
      {children}
    </Card>
  )
}

export default async function SettingsPage() {
  const user = await requireUser('/account/settings')
  const profile = await getProfile()
  return (
    <div className="space-y-6">
      <AccountPageHeader title="Settings" description="Your details, sign-in and privacy." />
      <Panel title="Your details">
        <ProfileForm
          defaults={{
            full_name: profile?.full_name ?? '',
            phone: profile?.phone ?? null,
            preferred_contact: profile?.preferred_contact ?? null,
            marketing_opt_in: profile?.marketing_opt_in ?? false,
          }}
        />
      </Panel>
      <Panel title="Email address">
        <EmailForm current={user.email ?? ''} />
      </Panel>
      <Panel title="Password">
        <UpdatePasswordForm />
      </Panel>
      <Panel title="Delete account">
        {profile?.deletion_requested_at ? (
          <FormAlert tone="info">You asked us to delete your account on {formatDate(profile.deletion_requested_at)}. We will email you when it is done.</FormAlert>
        ) : (
          <DeleteAccountForm />
        )}
      </Panel>
    </div>
  )
}
