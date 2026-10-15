import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { AdminHeader, Panel } from '@/components/admin/AdminUi'
import { QuestionEditor } from '@/components/admin/QuestionEditor'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Edit request questions' }

export default async function EditQuestionsPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  await requireAdminPage()
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound()
  const db = getAdminSupabase()
  const [{ data: c }, { data: verticals }] = await Promise.all([
    db.from('service_categories').select('id, name, slug, question_schema, allows_emergency, vertical_key').eq('id', params.id).maybeSingle(),
    db.from('verticals').select('key, name').order('sort'),
  ])
  if (!c) notFound()
  const schema = Array.isArray(c.question_schema) && c.question_schema.length ? JSON.stringify(c.question_schema, null, 2) : '[]'
  return (
    <div className="max-w-3xl space-y-5">
      <AdminHeader title={`Questions: ${c.name}`} actions={<ButtonLink href={`/request-service/${c.slug}`} variant="secondary" size="sm">View the public form</ButtonLink>} />
      <Panel>
        <QuestionEditor categoryId={c.id} initial={schema} allowsEmergency={c.allows_emergency} verticalKey={c.vertical_key ?? 'contractors'} verticals={verticals ?? []} />
      </Panel>
    </div>
  )
}
