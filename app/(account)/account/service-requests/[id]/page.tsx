import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { loadRequestView } from '@/lib/data/request-view'
import { loadEmployerDesk } from '@/lib/jobs-desk-data'
import { STAFFING_SLUG } from '@/lib/service-requests/form-copy'
import { getAmScope, getJobsI18n, getLocale } from '@/lib/i18n/server'
import { translator } from '@/lib/i18n/translate'
import { RequestView } from '@/components/service-requests/RequestView'
import { LoadFailed } from '@/components/account/LoadFailed'
import { log } from '@/lib/log'

/** In Amharic for Jobs, a staffing request's tab title goes through the Jobs translator; everything else is unchanged. */
export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const base = { title: 'Service request' }
  if ((await getLocale()) !== 'am' || (await getAmScope()) !== 'jobs') return base
  const { id } = await props.params
  if (!/^[0-9a-f-]{36}$/.test(id)) return base
  const view = await loadRequestView(id)
  if (view?.serviceSlug !== STAFFING_SLUG) return base
  const { t } = await getJobsI18n()
  return { title: t(base.title) }
}

export default async function MyServiceRequestPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { href } = await getJobsI18n()
  const user = await requireUser(href(`/account/service-requests/${params.id}`))
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound()
  // RLS: only the requester can read their own request.
  const { data: own, error } = await getServerSupabase().from('service_requests').select('id').eq('id', params.id).eq('requester_user_id', user.id).maybeSingle()
  if (error) {
    log.error('account', 'service request failed to load', error)
    return <LoadFailed what="this request" />
  }
  if (!own) notFound()
  const view = await loadRequestView(own.id)
  if (!view) notFound()
  // Staffing: the people HagerLand introduced (only when the recruitment desk switch is on; ownership checked above).
  const desk = view.serviceSlug === STAFFING_SLUG ? await loadEmployerDesk(view.id) : null
  // Staffing requests are Jobs pages (Jobs Phase 5): the Jobs translator. Other services keep the site translator.
  const jobs = view.serviceSlug === STAFFING_SLUG ? await getJobsI18n() : null
  const t = jobs ? jobs.t : translator(await getLocale())
  return <RequestView r={view} desk={desk} t={t} locale={jobs ? jobs.locale : 'en'} />
}
