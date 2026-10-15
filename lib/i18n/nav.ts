import type { NavGroup, NavLink, ServiceTile } from '@/lib/navigation'
import { localizeHref, type Locale } from './config'
import type { Translate } from './translate'

export function localizeLink(l: NavLink, t: Translate, locale: Locale): NavLink {
  return { ...l, label: t(l.label), description: l.description ? t(l.description) : undefined, href: localizeHref(l.href, locale) }
}

export function localizeTile(x: ServiceTile, t: Translate, locale: Locale): ServiceTile {
  return { ...x, name: t(x.name), tagline: t(x.tagline), href: localizeHref(x.href, locale), modes: x.modes.map((m) => t(m)) }
}

export function localizeGroups(groups: NavGroup[], t: Translate, locale: Locale): NavGroup[] {
  const map = (links?: NavLink[]) => links?.map((l) => localizeLink(l, t, locale))
  return groups.map((g) => ({ ...g, label: t(g.label), href: localizeHref(g.href, locale), links: map(g.links) ?? [], modes: g.modes?.map((m) => t(m)), featured: map(g.featured), cta: g.cta ? localizeLink(g.cta, t, locale) : undefined }))
}
