export const ENQUIRY_STATUS: Record<string, { label: string; tone: 'green' | 'info' | 'gold' | 'neutral' | 'danger' | 'ink' }> = {
  new: { label: 'New', tone: 'green' },
  contacted: { label: 'Contacted', tone: 'info' },
  qualified: { label: 'Qualified', tone: 'gold' },
  won: { label: 'Won', tone: 'ink' },
  lost: { label: 'Lost', tone: 'neutral' },
  spam: { label: 'Spam', tone: 'danger' },
}

export const TARGET_LABEL: Record<string, string> = {
  property: 'Property',
  development: 'Development',
  organisation: 'Your profile',
  product: 'Product',
  hagerland_development: 'HagerLand Developments',
  general: 'General',
}
