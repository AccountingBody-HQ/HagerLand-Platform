import { VerticalGate } from '@/components/verticals/VerticalGate'

/** Pages under /suppliers follow the building-supplies vertical's status (spec 24.2). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <VerticalGate verticalKey="building-supplies">{children}</VerticalGate>
}
