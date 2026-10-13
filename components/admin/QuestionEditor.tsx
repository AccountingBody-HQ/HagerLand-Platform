'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { saveRequestSettingsAction } from '@/app/roodber8/actions/service-requests'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Select, Textarea } from '@/components/ui/Field'
import { FormAlert } from '@/components/forms/FormParts'
import { useToast } from '@/components/ui/Toast'
import { QUESTION_TYPES, validateQuestionJson } from '@/lib/service-requests/questions'

const EXAMPLE = `[
  { "id": "property_type", "label": "Type of property", "type": "select", "options": ["House", "Apartment", "Commercial"], "required": true },
  { "id": "rooms", "label": "How many rooms?", "type": "number" },
  { "id": "water_leak", "label": "Is water leaking now?", "type": "yesno" }
]`

/** JSON editor for a category's request questions, with live checking and a preview (spec 24.5, 24.12). */
export function QuestionEditor({ categoryId, initial, allowsEmergency, verticalKey, verticals }: { categoryId: string; initial: string; allowsEmergency: boolean; verticalKey: string; verticals: { key: string; name: string }[] }) {
  const [json, setJson] = useState(initial)
  const [emergency, setEmergency] = useState(allowsEmergency)
  const [vertical, setVertical] = useState(verticalKey)
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const check = useMemo(() => validateQuestionJson(json.trim() || '[]'), [json])
  return (
    <div className="space-y-4">
      <Field label="Vertical" htmlFor="qe-vertical" hint="Which part of HagerLand this service belongs to. Requests appear only while that vertical is live.">
        <Select id="qe-vertical" value={vertical} onChange={(e) => setVertical(e.target.value)}>
          {verticals.map((v) => (
            <option key={v.key} value={v.key}>
              {v.name}
            </option>
          ))}
        </Select>
      </Field>
      <Checkbox id="qe-emergency" label="Customers can mark requests as an emergency" checked={emergency} onChange={(e) => setEmergency(e.target.checked)} />
      <Field label="Questions (JSON)" htmlFor="qe-json" hint={`Each question: id (lower case), label, type (${QUESTION_TYPES.join(', ')}), optional "required": true, "options" for select and multi, optional "hint".`}>
        <Textarea id="qe-json" rows={14} value={json} onChange={(e) => setJson(e.target.value)} className="font-mono text-small" spellCheck={false} />
      </Field>
      {check.ok ? (
        <FormAlert tone="success">
          {check.questions.length === 0 ? 'No extra questions: customers describe the job in their own words.' : `${check.questions.length} question${check.questions.length === 1 ? '' : 's'}: ${check.questions.map((q) => q.label).join(' · ')}`}
        </FormAlert>
      ) : (
        <FormAlert>{check.error}</FormAlert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending || !check.ok}
          onClick={() =>
            start(async () => {
              const res = await saveRequestSettingsAction(categoryId, { questions: json, allows_emergency: emergency, vertical_key: vertical })
              toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
              if (res.ok) router.refresh()
            })
          }
        >
          Save
        </Button>
        {json.trim() === '' || json.trim() === '[]' ? (
          <Button variant="secondary" onClick={() => setJson(EXAMPLE)}>
            Start from an example
          </Button>
        ) : null}
      </div>
    </div>
  )
}
