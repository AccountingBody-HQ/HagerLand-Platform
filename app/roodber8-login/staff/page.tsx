import { LogoMark } from '@/components/brand/Logo'
import { StaffSetup } from './StaffSetup'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Set up your staff account', robots: { index: false, follow: false } }

/** Accepting a staff invitation: password, then two-factor enrolment (spec 26.15). */
export default async function StaffSetupPage(props: { searchParams: Promise<{ token?: string }> }) {
  const { token = '' } = await props.searchParams
  return (
    <main className="hl-blueprint flex min-h-dvh items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-7 shadow-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="size-11" />
          <h1 className="mt-3 font-display text-h3 font-extrabold">Set up your staff account</h1>
          <p className="text-small text-muted">Two-factor sign-in is required for every staff member.</p>
        </div>
        <StaffSetup token={token.slice(0, 64)} />
      </div>
    </main>
  )
}
