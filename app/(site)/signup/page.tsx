import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { buildMetadata } from '@/lib/seo'
import { SIGNUP_INTENTS, type SignupIntent } from '@/lib/validation/auth'
import { AuthCard } from '@/components/auth/AuthCard'
import { SignupFlow } from '@/components/auth/SignupFlow'
import { GoogleButton } from '@/components/auth/GoogleButton'

export const dynamic = 'force-dynamic'
export const metadata = buildMetadata({ title: 'Create an account', description: 'Create a free HagerLand account to list property, receive enquiries and request quotes.', path: '/signup', noindex: true })

const TYPE_ALIASES: Record<string, SignupIntent> = { owner: 'owner', agent: 'agent', agents: 'agent', developer: 'developer', developers: 'developer', professional: 'professional', professionals: 'professional', supplier: 'supplier', suppliers: 'supplier', looking: 'looking' }

export default async function SignupPage({ searchParams }: { searchParams: { type?: string } }) {
  if (await getUser()) redirect('/account')
  const initial = searchParams.type ? TYPE_ALIASES[searchParams.type] ?? null : null
  return (
    <AuthCard title="Create your account" subtitle="Free to join. It takes about a minute." wide>
      <SignupFlow initialIntent={initial && (SIGNUP_INTENTS as readonly string[]).includes(initial) ? initial : null} />
      <div className="mt-6 space-y-4">
        <GoogleButton next="/onboarding" />
        <p className="text-center text-small text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-green hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthCard>
  )
}
