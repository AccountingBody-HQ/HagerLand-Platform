import { Fragment, type ReactNode } from 'react'
import { formatPhone, whatsappLink } from '@/lib/format'

const linkClass = 'inline-flex min-h-11 items-center font-semibold text-green underline'

/** A Telegram username (not a number) opens in Telegram; a number is shown as typed. */
function telegramLink(handle: string): string | null {
  const name = handle.trim().replace(/^@/, '')
  return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(name) ? `https://t.me/${name}` : null
}

/**
 * A supply contact's ways to reach them, in one style on the partner panel and the quote's Suppliers panel: readable
 * phone (+251 91 123 4567) as a tap-to-call link, then WhatsApp and Telegram when recorded. Admin only.
 */
export function SupplyContactLinks({ name, phone, whatsapp, telegram, email }: { name?: string | null; phone: string | null; whatsapp: string | null; telegram: string | null; email?: string | null }) {
  const parts: ReactNode[] = []
  if (name) parts.push(name)
  if (phone)
    parts.push(
      phone.startsWith('+') ? (
        <a href={`tel:${phone}`} className={linkClass}>
          {formatPhone(phone)}
        </a>
      ) : (
        phone
      ),
    )
  if (whatsapp)
    parts.push(
      <>
        WhatsApp{' '}
        <a href={whatsappLink(whatsapp)} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {formatPhone(whatsapp)}
        </a>
      </>,
    )
  if (telegram) {
    const href = telegramLink(telegram)
    parts.push(
      <>
        Telegram{' '}
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {telegram}
          </a>
        ) : (
          telegram
        )}
      </>,
    )
  }
  if (email) parts.push(email)
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && ' · '}
          {p}
        </Fragment>
      ))}
    </>
  )
}
