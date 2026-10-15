import { requireUser } from '@/lib/auth'
import { buildMetadata } from '@/lib/seo'
import { AuthCard } from '@/components/auth/AuthCard'
import { UpdatePasswordForm } from '@/components/auth/PasswordForms'

export const dynamic = 'force-dynamic'
export const metadata = buildMetadata({ title: 'Choose a new password', description: 'Set a new password for your HagerLand account.', path: '/auth/update-password', noindex: true })

export default async function UpdatePasswordPage() {
  await requireUser('/auth/update-password')
  return (
    <AuthCard title="Choose a new password">
      <UpdatePasswordForm />
    </AuthCard>
  )
}
