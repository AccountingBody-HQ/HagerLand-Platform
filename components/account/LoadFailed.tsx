import { FormAlert } from '@/components/forms/FormParts'

/**
 * QC-1a: an account read that failed shows this, never "nothing yet" (the F-2 failure rule). The sentence is the one
 * "My quotes" already uses; only the thing that could not be loaded changes ("your service requests", "this job").
 */
export function LoadFailed({ what }: { what: string }) {
  return <FormAlert>We could not load {what} just now. Please refresh the page.</FormAlert>
}
