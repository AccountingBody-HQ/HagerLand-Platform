import { buildMetadata } from '@/lib/seo'
import { AuthCard } from '@/components/auth/AuthCard'
import { ResetPasswordForm } from '@/components/auth/PasswordForms'

export const metadata = buildMetadata({ title: 'Reset your password', description: 'Get a link to set a new HagerLand password.', path: '/auth/reset-password', noindex: true })

export default function ResetPasswordPage() {
  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a link to choose a new one.">
      <ResetPasswordForm />
    </AuthCard>
  )
}
