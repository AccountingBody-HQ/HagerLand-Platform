import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { loadRequestView } from '@/lib/data/request-view'
import { RequestView } from '@/components/service-requests/RequestView'

export const metadata = { title: 'Service request' }

export default async function MyServiceRequestPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/account/service-requests/${params.id}`)
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound()
  // RLS: only the requester can read their own request.
  const { data: own } = await getServerSupabase().from('service_requests').select('id').eq('id', params.id).eq('requester_user_id', user.id).maybeSingle()
  if (!own) notFound()
  const view = await loadRequestView(own.id)
  if (!view) notFound()
  return <RequestView r={view} />
}
