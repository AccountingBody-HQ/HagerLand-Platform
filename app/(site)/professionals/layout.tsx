import { VerticalGate } from '@/components/verticals/VerticalGate'

/** Pages under /professionals follow the professionals vertical's status (spec 24.2). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <VerticalGate verticalKey="professionals">{children}</VerticalGate>
}
