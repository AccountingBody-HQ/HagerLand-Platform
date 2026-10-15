import { VerticalGate } from '@/components/verticals/VerticalGate'

/** Pages under /developments follow the property vertical's status (spec 24.2). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <VerticalGate verticalKey="property">{children}</VerticalGate>
}
