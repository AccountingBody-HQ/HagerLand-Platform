import Link from 'next/link'
import { brand } from '@/lib/brand'
import { getBusinessDetails } from '@/lib/data/business'
import { FOOTER_COLUMNS } from '@/lib/navigation'
import { Wordmark } from '@/components/brand/Logo'
import { SocialIcon, socialLabel } from '@/components/brand/SocialIcon'
import { Container } from '@/components/ui/Layout'

export async function SiteFooter() {
  const business = await getBusinessDetails()
  const socials = business.social
  const year = new Date().getFullYear()
  return (
    <footer className="bg-ink text-white">
      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark inverse />
            <p className="mt-4 max-w-xs text-white/75">{brand.descriptor}</p>
            <p className="mt-1 font-display font-bold text-gold">{brand.tagline}</p>
            {socials.length > 0 && (
              <ul className="mt-6 flex gap-2">
                {socials.map((s) => (
                  <li key={s.key}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${brand.name} on ${socialLabel(s.key)}`}
                      className="inline-flex size-11 items-center justify-center rounded-md bg-white/10 hover:bg-white/20"
                    >
                      <SocialIcon name={s.key} className="size-5" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="font-display text-body font-bold text-white">{col.title}</h2>
              <ul className="mt-4 space-y-1">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="inline-flex min-h-9 items-center text-white/75 hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-3 py-6 text-small text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {brand.name}
            {business.legalLine && <span> · {business.legalLine}</span>}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
            <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
            <li><Link href="/cookies" className="hover:text-white">Cookies</Link></li>
          </ul>
        </Container>
      </div>
    </footer>
  )
}
