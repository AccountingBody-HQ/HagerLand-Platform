'use client'

import { useFormState } from 'react-dom'
import { saveAdminPropertyAction } from '@/app/roodber8/actions/properties'
import { BasicsFields, ContactFields, DetailsFields, LocationFields, type WizardValues } from '@/components/account/ListingWizard'
import { Field, Select } from '@/components/ui/Field'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { Panel } from './AdminUi'

export function AdminPropertyForm({ id, version, values, listers, developments, currentLister }: { id?: string; version?: string; values: WizardValues; listers: { id: string; label: string }[]; developments: { id: string; name: string }[]; currentLister?: string | null }) {
  const [state, action] = useFormState(saveAdminPropertyAction, null)
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <form action={action} className="space-y-5" noValidate>
      {id && <input type="hidden" name="id" value={id} />}
      {version && <input type="hidden" name="expected_updated_at" value={version} />}
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      {state?.ok && <FormAlert tone="success">{state.message}</FormAlert>}
      <Panel title="Lister">
        <Field label="Listed by" htmlFor="ap-lister" error={errors.lister} hint="An agency or developer, or HagerLand Developments for our own homes.">
          <Select id="ap-lister" name="lister" defaultValue={currentLister ?? (id ? 'keep' : '')}>
            {id ? <option value="keep">Keep current lister</option> : <option value="">Choose</option>}
            {listers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
      </Panel>
      <Panel title="Basics">
        <BasicsFields v={values} errors={errors} />
      </Panel>
      <Panel title="Location">
        <LocationFields v={values} errors={errors} developments={developments} />
      </Panel>
      <Panel title="Details">
        <DetailsFields v={values} errors={errors} purpose={values.purpose ?? 'sale'} />
      </Panel>
      <Panel title="Contact">
        <ContactFields v={values} errors={errors} />
      </Panel>
      <SubmitButton size="lg" pendingText="Saving…">
        {id ? 'Save changes' : 'Create listing'}
      </SubmitButton>
    </form>
  )
}
