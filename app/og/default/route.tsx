import { renderOg } from '@/lib/og'

export const revalidate = 86400

/** Default share image for pages without their own. */
export async function GET() {
  return renderOg({ eyebrow: 'Property · Supplies · Professionals', title: 'From the first brick to the front door.', subtitle: "Ethiopia's construction and property platform" })
}
