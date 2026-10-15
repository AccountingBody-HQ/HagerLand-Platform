export interface SuggestItem {
  label: string
  href: string
  meta?: string
}

export interface SuggestGroup {
  id: 'properties' | 'developments' | 'products' | 'companies' | 'locations' | 'categories'
  label: string
  items: SuggestItem[]
}

export interface SuggestResponse {
  q: string
  groups: SuggestGroup[]
}
