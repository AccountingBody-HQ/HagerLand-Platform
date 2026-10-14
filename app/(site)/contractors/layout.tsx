import { VerticalGate } from '@/components/verticals/VerticalGate'

/** Pages under /contractors follow the contractors vertical's status (spec 24.2). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <VerticalGate verticalKey="contractors">{children}</VerticalGate>
}
