import type { NavGroup, NavLink } from '@/lib/navigation'
import { localizeHref, type Locale } from './config'
import type { Translate } from './translate'

export function localizeLink(l: NavLink, t: Translate, locale: Locale): NavLink {
  return { ...l, label: t(l.label), description: l.description ? t(l.description) : undefined, href: localizeHref(l.href, locale) }
}

export function localizeGroups(groups: NavGroup[], t: Translate, locale: Locale): NavGroup[] {
  const map = (links?: NavLink[]) => links?.map((l) => localizeLink(l, t, locale))
  return groups.map((g) => ({ ...g, label: t(g.label), href: localizeHref(g.href, locale), links: map(g.links) ?? [], featured: map(g.featured), cta: g.cta ? localizeLink(g.cta, t, locale) : undefined }))
}
