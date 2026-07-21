'use server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { requireAdminSession, verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { Resend } from 'resend'

const TABLES = ['jobs', 'housing', 'cars', 'tutors', 'community', 'events', 'companies', 'money'] as const
type TableName = (typeof TABLES)[number]

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

function isValidTable(table: string): table is TableName {
  return (TABLES as readonly string[]).includes(table)
}

function revalidateAll() {
  revalidatePath('/roodber8')
  revalidatePath('/roodber8/review')
  revalidatePath('/roodber8/businesses')
  revalidatePath('/business')
  revalidatePath('/business/[id]', 'page')
  revalidatePath('/jobs')
  revalidatePath('/housing')
  revalidatePath('/money')
  revalidatePath('/cars')
  revalidatePath('/tutors')
  revalidatePath('/community')
  revalidatePath('/events')
  revalidatePath('/jobs/[id]', 'page')
  revalidatePath('/housing/[id]', 'page')
  revalidatePath('/money/[id]', 'page')
  revalidatePath('/cars/[id]', 'page')
  revalidatePath('/tutors/[id]', 'page')
  revalidatePath('/community/[id]', 'page')
  revalidatePath('/events/[id]', 'page')
  revalidatePath('/roodber8/jobs')
  revalidatePath('/roodber8/housing')
  revalidatePath('/roodber8/money')
  revalidatePath('/roodber8/cars')
  revalidatePath('/roodber8/tutors')
  revalidatePath('/roodber8/community')
  revalidatePath('/roodber8/events')
}

export async function approveListing(table: string, id: string) {
  requireAdminSession()
  if (!isValidTable(table)) throw new Error('Invalid table')
  const supabase = getAdmin()
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hagerland-platform.vercel.app'

  if (table === 'companies') {
    // Fetch pending_changes and contact details
    const { data: company } = await supabase
      .from('companies')
      .select('pending_changes, contact_email, company_name, manage_token')
      .eq('id', id)
      .single()

    // For imported listings, approval makes them active but not verified
    // is_verified is only set true when the owner claims and verifies the listing
    const { data: existing } = await supabase.from(table).select('source').eq('id', id).single()
    const isImport = existing?.source === 'admin_import'
    const updateData: Record<string, unknown> = { status: 'active', is_verified: isImport ? false : true, pending_changes: null }

    // Apply pending_changes to live fields if any
    if (company?.pending_changes) {
      for (const [field, values] of Object.entries(company.pending_changes as Record<string, { old: string | null, new: string | null }>)) {
        updateData[field] = values.new
      }
    }

    const { error } = await supabase.from('companies').update(updateData).eq('id', id)
    if (error) throw new Error(error.message)

    // Send approval confirmation email
    if (company?.contact_email) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const manageUrl = company.manage_token ? `${baseUrl}/business/manage?token=${company.manage_token}` : `${baseUrl}/business`
      const GREEN = '#1C7C4C'
      await resend.emails.send({
        from: 'HagerLand <info@accountingbody.com>',
        to: company.contact_email,
        subject: `Your listing has been approved — ${company.company_name}`,
        html: `
          <!DOCTYPE html>
          <html lang="en">
          <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
          <body style="margin:0;padding:0;background:#f4f5f3;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f3;padding:40px 16px;">
              <tr><td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">
                  <tr><td style="background:${GREEN};border-radius:16px 16px 0 0;padding:32px 40px;">
                    <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">ሃገር · Homeland · HagerLand</p>
                    <p style="margin:0;color:#fff;font-size:22px;font-weight:700;line-height:1.3;">Community Directory</p>
                  </td></tr>
                  <tr><td style="background:#ffffff;padding:40px;border-left:1px solid #e4e6e3;border-right:1px solid #e4e6e3;">
                    <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#152238;">Your changes have been approved</h2>
                    <p style="margin:0 0 16px;font-size:14px;color:#6B7280;line-height:1.6;">
                      The updates you submitted for <strong style="color:#152238;">${company.company_name}</strong> have been reviewed and approved by our team. Your listing is now live.
                    </p>
                    <a href="${manageUrl}" style="display:inline-block;background:${GREEN};color:#ffffff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:100px;text-decoration:none;">
                      View my listing
                    </a>
                  </td></tr>
                  <tr><td style="background:#f4f5f3;border-radius:0 0 16px 16px;padding:24px 40px;border:1px solid #e4e6e3;border-top:none;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">HagerLand — The free, verified community directory.<br>Serving the diaspora worldwide.</p>
                  </td></tr>
                </table>
              </td></tr>
            </table>
          </body>
          </html>
        `
      })
    }
  } else {
    const { data: listing } = await supabase
      .from(table)
      .select('contact_email, title, name, manage_token, pending_changes')
      .eq('id', id)
      .single()

    const updateData: Record<string, unknown> = { status: 'active', pending_changes: null }

    // Apply pending_changes if any
    if (listing?.pending_changes) {
      for (const [field, values] of Object.entries(listing.pending_changes as Record<string, { old: string | null, new: string | null }>)) {
        updateData[field] = values.new
      }
    }

    const { error } = await supabase.from(table).update(updateData).eq('id', id)
    if (error) throw new Error(error.message)

    // Send approval confirmation email
    if (listing?.contact_email) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hagerland-platform.vercel.app'
      const listingName = (listing as Record<string, string>).title || (listing as Record<string, string>).name || 'Your listing'
      const manageUrl = listing.manage_token ? `${baseUrl}/${table}/manage?token=${listing.manage_token}` : `${baseUrl}/${table}`
      const GREEN = '#1C7C4C'
      await resend.emails.send({
        from: 'HagerLand <info@accountingbody.com>',
        to: listing.contact_email,
        subject: `Your listing has been approved — ${listingName}`,
        html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
          <body style="margin:0;padding:0;background:#f4f5f3;font-family:-apple-system,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f3;padding:40px 16px;"><tr><td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">
          <tr><td style="background:${GREEN};border-radius:16px 16px 0 0;padding:32px 40px;">
          <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">ሃገር · Homeland · HagerLand</p>
          <p style="margin:0;color:#fff;font-size:22px;font-weight:700;">Community Directory</p></td></tr>
          <tr><td style="background:#ffffff;padding:40px;border-left:1px solid #e4e6e3;border-right:1px solid #e4e6e3;">
          <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#152238;">Your listing has been approved</h2>
          <p style="margin:0 0 16px;font-size:14px;color:#6B7280;line-height:1.6;">
            <strong style="color:#152238;">${listingName}</strong> has been reviewed and approved by our team. Your listing is now live on HagerLand.
          </p>
          <a href="${manageUrl}" style="display:inline-block;background:${GREEN};color:#ffffff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:100px;text-decoration:none;">View my listing</a>
          </td></tr>
          <tr><td style="background:#f4f5f3;border-radius:0 0 16px 16px;padding:24px 40px;border:1px solid #e4e6e3;border-top:none;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">HagerLand — The free, verified community directory.</p>
          </td></tr></table></td></tr></table></body></html>`
      })
    }
  }
  revalidateAll()
}

export async function rejectListing(table: string, id: string) {
  requireAdminSession()
  if (!isValidTable(table)) throw new Error('Invalid table')
  const supabase = getAdmin()
  const updateData: Record<string, unknown> = { status: 'rejected' }
  if (table === 'companies') updateData.pending_changes = null
  const { error } = await supabase.from(table).update(updateData).eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function deleteListing(table: string, id: string) {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) throw new Error('Unauthorized')
  if (!isValidTable(table)) throw new Error('Invalid table')
  const supabase = getAdmin()
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function deactivateListing(table: string, id: string) {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) throw new Error('Unauthorized')
  if (!isValidTable(table)) throw new Error('Invalid table')
  const supabase = getAdmin()
  const { error } = await supabase.from(table).update({ status: 'pending' }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function updateCompany(id: string, data: {
  company_name?: string
  trading_address_city?: string
  phone?: string
  website?: string
  sic_description?: string
  submitter_name?: string
  ai_description?: string | null
  country?: string | null
  address?: string | null
  opening_hours?: string | null
  instagram?: string | null
  facebook?: string | null
  whatsapp?: string | null
}) {
  requireAdminSession()
  const supabase = getAdmin()
  const { error } = await supabase.from('companies').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function approveClaim(claimId: string, companyId: string) {
  requireAdminSession()
  const supabase = getAdmin()
  const { error: claimError } = await supabase.from('business_claims').update({ status: 'approved' }).eq('id', claimId)
  if (claimError) throw new Error(claimError.message)
  const { error: companyError } = await supabase.from('companies').update({ is_verified: true }).eq('id', companyId)
  if (companyError) throw new Error(companyError.message)
  revalidateAll()
}

export async function rejectClaim(claimId: string) {
  requireAdminSession()
  const supabase = getAdmin()
  const { error } = await supabase.from('business_claims').update({ status: 'rejected' }).eq('id', claimId)
  if (error) throw new Error(error.message)
  revalidateAll()
}
export async function deleteClaim(claimId: string) {
  requireAdminSession()
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
  await supabase.from('business_claims').delete().eq('id', claimId)
  revalidateAll()
}
