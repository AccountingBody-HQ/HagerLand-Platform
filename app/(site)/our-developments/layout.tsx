import { VerticalGate } from '@/components/verticals/VerticalGate'

/** Pages under /our-developments follow the our-developments vertical's status (spec 24.2). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <VerticalGate verticalKey="our-developments">{children}</VerticalGate>
}
