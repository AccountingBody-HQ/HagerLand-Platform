import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { loadRequestView } from '@/lib/data/request-view'
import { loadEmployerDesk } from '@/lib/jobs-desk-data'
import { STAFFING_SLUG } from '@/lib/service-requests/form-copy'
import { getLocale } from '@/lib/i18n/server'
import { translator } from '@/lib/i18n/translate'
import { RequestView } from '@/components/service-requests/RequestView'

export const metadata = { title: 'Service request' }

export default async function MyServiceRequestPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const user = await requireUser(`/account/service-requests/${params.id}`)
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound()
  // RLS: only the requester can read their own request.
  const { data: own } = await getServerSupabase().from('service_requests').select('id').eq('id', params.id).eq('requester_user_id', user.id).maybeSingle()
  if (!own) notFound()
  const view = await loadRequestView(own.id)
  if (!view) notFound()
  // Staffing: the people HagerLand introduced (only when the recruitment desk switch is on; ownership checked above).
  const desk = view.serviceSlug === STAFFING_SLUG ? await loadEmployerDesk(view.id) : null
  return <RequestView r={view} desk={desk} t={translator(await getLocale())} />
}
