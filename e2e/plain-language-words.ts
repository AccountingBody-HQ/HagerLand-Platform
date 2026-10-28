/**
 * Internal strategy words that never reach visitors (polish round 1, AB's direction 2.2). Shared by the plain-language
 * test and the Amharic Jobs pages check (Jobs Phase 5).
 */
export const BANNED: [string, RegExp][] = [
  ['ecosystem', /ecosystem/i],
  ['nucleus', /nucleus/i],
  ['pillar', /pillar/i],
  ['vertical', /\bverticals?\b/i],
  ['cross-cutting', /cross-cutting/i],
  ['customer/supply layer', /\b(customer|supply) layer\b/i],
  ['enablers', /\benablers?\b/i],
  ['property lifecycle', /lifecycle/i],
  ['mode name: Direct', /\bDirect (mode|provision)\b/i],
  ['mode name: Aggregate', /\baggregat(e|ion)\b/i],
  ['mode name: Interest capture', /interest capture/i],
  ['mode chip: Provided by HagerLand', /provided by hagerland/i],
  ['mode chip: Trusted partners', /trusted partners/i],
  ['old support line', /Find it\. Buy it\./],
]
