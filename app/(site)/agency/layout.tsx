import { VerticalGate } from '@/components/verticals/VerticalGate'

/** HagerLand agency services belong to the Property vertical (spec 24.2, 24.7). */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <VerticalGate verticalKey="property">{children}</VerticalGate>
}
