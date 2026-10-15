import { getAdminSupabase } from '@/lib/supabase/admin'
import { signedDocumentUrl } from '@/lib/storage'
import { formatDate } from '@/lib/format'
import { Panel } from '@/components/admin/AdminUi'
import { DocumentUpload, NoteForm, TaskDone, TaskForm } from '@/components/admin/AgencyTools'

/** Tasks, private documents and the activity timeline of one agency record (spec 26.5). */
export async function AgencyRecordSide({ entity, id }: { entity: 'contact' | 'instruction' | 'valuation' | 'viewing' | 'offer' | 'application' | 'tenancy'; id: string }) {
  const db = getAdminSupabase()
  const [{ data: tasks }, { data: docs }, { data: activity }] = await Promise.all([
    db.from('agency_tasks').select('id, title, due_on, assigned_to, done, done_at').eq('entity_type', entity).eq('entity_id', id).order('done').order('due_on', { nullsFirst: false }).limit(100),
    db.from('agency_documents').select('id, label, storage_path, created_at').eq('entity_type', entity).eq('entity_id', id).order('created_at', { ascending: false }).limit(50),
    db.from('agency_activity').select('id, kind, text, actor, created_at').eq('entity_type', entity).eq('entity_id', id).order('created_at', { ascending: false }).limit(100),
  ])
  const files = await Promise.all((docs ?? []).map(async (d) => ({ ...d, url: await signedDocumentUrl(d.storage_path, d.label) })))
  return (
    <div className="space-y-5">
      <Panel title="Tasks">
        <ul className="mb-4 space-y-2">
          {(tasks ?? []).map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-2 text-small">
              <span className={t.done ? 'text-muted line-through' : 'text-ink'}>
                {t.title}
                <span className="block text-caption text-muted">{[t.due_on ? `Due ${formatDate(t.due_on)}` : null, t.assigned_to, t.done && t.done_at ? `Done ${formatDate(t.done_at)}` : null].filter(Boolean).join(' · ')}</span>
              </span>
              {!t.done && <TaskDone id={t.id} />}
            </li>
          ))}
          {(tasks ?? []).length === 0 && <li className="text-small text-muted">No tasks.</li>}
        </ul>
        <TaskForm entity={entity} id={id} />
      </Panel>
      <Panel title="Documents">
        <ul className="mb-4 space-y-1 text-small">
          {files.map((f) => (
            <li key={f.id}>{f.url ? <a href={f.url} className="font-semibold text-green underline">{f.label}</a> : f.label} <span className="text-caption text-muted">· {formatDate(f.created_at)}</span></li>
          ))}
          {files.length === 0 && <li className="text-muted">No documents.</li>}
        </ul>
        <DocumentUpload entity={entity} id={id} folder={id} />
      </Panel>
      <Panel title="Timeline">
        <NoteForm entity={entity} id={id} />
        <ol className="mt-4 space-y-3 border-l-2 border-border pl-4 text-small">
          {(activity ?? []).map((a) => (
            <li key={a.id}>
              <span className="block text-ink">{a.text}</span>
              <span className="text-caption text-muted">
                {formatDate(a.created_at)} · {a.actor}
              </span>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  )
}
