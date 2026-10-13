import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { safeNextPath } from '@/lib/validation/common'
import { buildMetadata } from '@/lib/seo'
import { AuthCard } from '@/components/auth/AuthCard'
import { LoginForms } from '@/components/auth/LoginForms'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { FormAlert } from '@/components/forms/FormParts'

export const dynamic = 'force-dynamic'
export const metadata = buildMetadata({ title: 'Sign in', description: 'Sign in to manage your listings, enquiries and quotes on HagerLand.', path: '/login', noindex: true })

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const next = safeNextPath(searchParams.next)
  if (await getUser()) redirect(next)
  return (
    <AuthCard title="Sign in" subtitle="Manage your listings, enquiries and quotes.">
      {searchParams.error && (
        <FormAlert className="mb-4">
          {searchParams.error === 'link' ? 'That link has expired or was already used. Request a new one below.' : 'Sign-in did not complete. Please try again.'}
        </FormAlert>
      )}
      <GoogleButton next={next} />
      {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true' && <p className="my-5 text-center text-small text-muted">or</p>}
      <LoginForms next={next} />
      <p className="mt-6 text-center text-small text-muted">
        New to HagerLand?{' '}
        <Link href="/signup" className="font-semibold text-green hover:underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  )
}
