import { VerticalGate } from '@/components/verticals/VerticalGate'

/** Pages under /jobs follow the jobs vertical's status (spec 24.2). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <VerticalGate verticalKey="jobs">{children}</VerticalGate>
}
