import { cn } from '@/lib/cn'

/** One-choice chips (radio buttons) for short phone-first forms. Without a defaultValue nothing is chosen at first (QC-3). */
export function ChoiceChips({ legend, name, options, defaultValue, invalid }: { legend: string; name: string; options: { value: string; label: string }[]; defaultValue?: string; invalid?: boolean }) {
  return (
    <fieldset className={cn(invalid && 'rounded-md ring-2 ring-error')} aria-invalid={invalid || undefined}>
      <legend className="mb-2 text-small font-semibold text-ink">
        {legend}
        <span className="text-error" aria-hidden>
          {' '}
          *
        </span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input type="radio" name={name} value={o.value} defaultChecked={o.value === defaultValue} className="peer sr-only" />
            <span className="inline-flex min-h-11 items-center rounded-full border border-border-strong px-4 text-small font-medium peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-green">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
