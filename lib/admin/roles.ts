/**
 * Staff roles and the admin areas each may use (spec 26.15). Edge-safe: used by the middleware, server checks and
 * the admin menu. The master /roodber8 login (AB's break-glass access) and the "owner" role may use everything.
 */
export const STAFF_ROLES = ['owner', 'agent', 'operations', 'content'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export const ROLE_LABEL: Record<StaffRole, string> = {
  owner: 'Owner (everything)',
  agent: 'Agent (agency, viewings, offers, tenancies, listings)',
  operations: 'Operations (service requests, Property Care, quotes, supplies)',
  content: 'Content (guides, advice, locations)',
}

/** Path prefixes under /roodber8 (and admin APIs) each non-owner role may open. The dashboard is open to all staff. */
const AREAS: Record<Exclude<StaffRole, 'owner'>, string[]> = {
  agent: ['/roodber8/agency', '/roodber8/properties', '/roodber8/developments', '/roodber8/sales', '/roodber8/enquiries', '/roodber8/review'],
  operations: ['/roodber8/service-requests', '/roodber8/request-questions', '/roodber8/projects', '/roodber8/property-care', '/roodber8/managed-properties', '/roodber8/quotes', '/roodber8/products', '/roodber8/trade-accounts', '/roodber8/reviews', '/roodber8/organisations', '/roodber8/supply/partners', '/roodber8/supply/orders', '/roodber8/supply/performance', '/roodber8/demand/supplies', '/roodber8/demand/jobs', '/roodber8/imports', '/roodber8/jobs'],
  content: ['/roodber8/guides', '/roodber8/area-guides', '/roodber8/locations', '/roodber8/newsletter'],
}

/** CSV exports a non-owner role may download. */
const EXPORTS: Record<Exclude<StaffRole, 'owner'>, string[]> = {
  agent: ['agency-instructions', 'agency-report', 'properties', 'developments', 'sales', 'enquiries'],
  operations: ['service-requests', 'quotes', 'products', 'property-care', 'organisations'],
  content: ['newsletter'],
}

export function isStaffRole(v: unknown): v is StaffRole {
  return typeof v === 'string' && (STAFF_ROLES as readonly string[]).includes(v)
}

/** May this role open this admin path? */
export function roleCanAccess(role: StaffRole, pathname: string): boolean {
  if (role === 'owner') return true
  if (pathname === '/roodber8' || pathname === '/roodber8/') return true
  if (pathname.startsWith('/roodber8/export/')) return roleCanExport(role, pathname.split('/')[3] ?? '')
  return AREAS[role].some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function roleCanExport(role: StaffRole, kind: string): boolean {
  return role === 'owner' || EXPORTS[role].includes(kind)
}

/** Session cookie payload: "<expiresMs>" for the master login, "<expiresMs>~<staffId>~<role>" for staff. */
export function parseSessionPayload(payload: string): { expires: number; staffId: string | null; role: StaffRole | null } | null {
  const [exp, staffId, role] = payload.split('~')
  const expires = Number(exp)
  if (!Number.isFinite(expires) || !/^\d+$/.test(exp)) return null
  if (staffId === undefined) return { expires, staffId: null, role: null }
  if (!/^[0-9a-f-]{36}$/.test(staffId) || !isStaffRole(role)) return null
  return { expires, staffId, role }
}
