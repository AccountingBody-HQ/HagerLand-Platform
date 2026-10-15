import { VerticalGate } from '@/components/verticals/VerticalGate'

/** Pages under /insurance follow the insurance vertical's status (spec 24.2). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <VerticalGate verticalKey="insurance">{children}</VerticalGate>
}
