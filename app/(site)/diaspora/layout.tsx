import { VerticalGate } from '@/components/verticals/VerticalGate'

/** Pages under /diaspora follow the diaspora vertical's status (spec 24.2). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <VerticalGate verticalKey="diaspora">{children}</VerticalGate>
}
