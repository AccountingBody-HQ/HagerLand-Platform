import { VerticalGate } from '@/components/verticals/VerticalGate'

/** Pages under /repairs-maintenance follow the repairs-maintenance vertical's status (spec 24.2). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <VerticalGate verticalKey="repairs-maintenance">{children}</VerticalGate>
}
