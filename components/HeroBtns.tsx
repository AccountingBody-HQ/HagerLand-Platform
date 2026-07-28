import Link from 'next/link'

interface HeroButton {
  label: string
  href: string
  variant?: 'primary' | 'secondary'
}

export default function HeroBtns({ buttons }: { buttons: [HeroButton, HeroButton] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {buttons.map(btn => (
        <Link key={btn.href} href={btn.href}
          className={`hero-btn ${btn.variant === 'secondary' ? 'hero-btn-secondary' : 'hero-btn-primary'}`}>
          {btn.label}
        </Link>
      ))}
    </div>
  )
}
