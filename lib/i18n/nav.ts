import type { AllServices, NavGroup, NavLink, ServiceTile } from '@/lib/navigation'
import { localizeHref, type Locale } from './config'
import type { Translate } from './translate'

export function localizeLink(l: NavLink, t: Translate, locale: Locale): NavLink {
  return { ...l, label: t(l.label), description: l.description ? t(l.description) : undefined, href: localizeHref(l.href, locale) }
}

export function localizeTile(x: ServiceTile, t: Translate, locale: Locale): ServiceTile {
  return { ...x, name: t(x.name), tagline: t(x.tagline), action: t(x.action), href: localizeHref(x.href, locale) }
}

export function localizeAllServices(all: AllServices, t: Translate, locale: Locale): AllServices {
  const tile = (x: ServiceTile | null) => (x ? localizeTile(x, t, locale) : null)
  return { groups: all.groups.map((g) => ({ ...g, title: t(g.title), text: t(g.text), tiles: g.tiles.map((x) => localizeTile(x, t, locale)) })), diaspora: tile(all.diaspora), professionals: tile(all.professionals) }
}

export function localizeGroups(groups: NavGroup[], t: Translate, locale: Locale): NavGroup[] {
  const map = (links?: NavLink[]) => links?.map((l) => localizeLink(l, t, locale))
  return groups.map((g) => ({ ...g, label: t(g.label), title: t(g.title), href: localizeHref(g.href, locale), links: map(g.links) ?? [], featured: map(g.featured), cta: g.cta ? localizeLink(g.cta, t, locale) : undefined }))
}
