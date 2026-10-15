import { VerticalGate } from '@/components/verticals/VerticalGate'

/** Pages under /finance follow the finance vertical's status (spec 24.2). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <VerticalGate verticalKey="finance">{children}</VerticalGate>
}
