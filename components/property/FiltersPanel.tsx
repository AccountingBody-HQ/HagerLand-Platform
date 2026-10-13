'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { ADDED_WITHIN, COMPLETION, FEATURES, FINISHING, FURNISHING, LISTER_TYPES, PROPERTY_TYPES } from '@/lib/labels'
import { PRICE_STEPS_RENT, PRICE_STEPS_SALE, parsePropertyParams, toQuery, type PropertyFilters } from '@/lib/property-search'
import { formatETBCompact } from '@/lib/format'
import { Combobox } from '@/components/ui/Combobox'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Field'
import { cn } from '@/lib/cn'

interface Props {
  purpose: 'sale' | 'rent'
  filters: PropertyFilters
  location: { path: string; name: string } | null
  activeCount: number
  total: number
}

function readForm(form: HTMLFormElement, base: PropertyFilters): PropertyFilters {
  const fd = new FormData(form)
  const raw: Record<string, string[]> = {}
  fd.forEach((value, key) => {
    if (typeof value === 'string' && value !== '') (raw[key] ??= []).push(value)
  })
  return { ...parsePropertyParams(raw), q: base.q, sort: base.sort, page: 1 }
}

function CheckGroup({ legend, name, options, selected }: { legend: string; name: string; options: { value: string; label: string }[]; selected: string[] }) {
  return (
    <fieldset>
      <legend className="mb-2 text-small font-semibold text-ink">{legend}</legend>
      <ul className="space-y-0.5">
        {options.map((o) => (
          <li key={o.value} className="flex min-h-10 items-center gap-2.5">
            <input id={`f-${name}-${o.value}`} type="checkbox" name={name} value={o.value} defaultChecked={selected.includes(o.value)} className="size-5 accent-green" />
            <label htmlFor={`f-${name}-${o.value}`} className="text-body">
              {o.label}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}

function FilterFields({ purpose, filters, location, onLocation }: Omit<Props, 'activeCount' | 'total'> & { onLocation: (path: string | null) => void }) {
  const steps = purpose === 'sale' ? PRICE_STEPS_SALE : PRICE_STEPS_RENT
  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="f-location" className="mb-2 block text-small font-semibold text-ink">
          Location
        </label>
        <Combobox
          id="f-location"
          endpoint="/api/locations?value=path"
          placeholder="Any location in Ethiopia"
          defaultValue={location ? { value: location.path, label: location.name } : null}
          onChange={(o) => onLocation(o?.value ?? null)}
        />
      </div>
      <CheckGroup legend="Property type" name="type" options={PROPERTY_TYPES} selected={filters.types} />
      <fieldset>
        <legend className="mb-2 text-small font-semibold text-ink">Price (ETB{purpose === 'rent' ? ' per month' : ''})</legend>
        <div className="grid grid-cols-2 gap-2">
          <Select name="price_min" aria-label="Minimum price" defaultValue={filters.priceMin ?? ''}>
            <option value="">No min</option>
            {steps.map((s) => (
              <option key={s} value={s}>
                {formatETBCompact(s)}
              </option>
            ))}
          </Select>
          <Select name="price_max" aria-label="Maximum price" defaultValue={filters.priceMax ?? ''}>
            <option value="">No max</option>
            {steps.map((s) => (
              <option key={s} value={s}>
                {formatETBCompact(s)}
              </option>
            ))}
          </Select>
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="f-beds" className="mb-2 block text-small font-semibold text-ink">
            Bedrooms
          </label>
          <Select id="f-beds" name="beds" defaultValue={filters.beds ?? ''}>
            <option value="">Any</option>
            <option value="0">Studio+</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="f-baths" className="mb-2 block text-small font-semibold text-ink">
            Bathrooms
          </label>
          <Select id="f-baths" name="baths" defaultValue={filters.baths ?? ''}>
            <option value="">Any</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </Select>
        </div>
      </div>
      <fieldset>
        <legend className="mb-2 text-small font-semibold text-ink">Size (m²)</legend>
        <div className="grid grid-cols-2 gap-2">
          <input name="area_min" inputMode="numeric" defaultValue={filters.areaMin ?? ''} placeholder="Min" aria-label="Minimum size in square metres" className="h-11 rounded-sm border border-border-strong px-3" />
          <input name="area_max" inputMode="numeric" defaultValue={filters.areaMax ?? ''} placeholder="Max" aria-label="Maximum size in square metres" className="h-11 rounded-sm border border-border-strong px-3" />
        </div>
      </fieldset>
      <CheckGroup legend="Finishing" name="finishing" options={FINISHING.filter((f) => f.value !== 'not_applicable')} selected={filters.finishing} />
      {purpose === 'rent' && <CheckGroup legend="Furnishing" name="furnishing" options={FURNISHING} selected={filters.furnishing} />}
      <CheckGroup legend="Completion" name="completion" options={COMPLETION} selected={filters.completion} />
      <div className="space-y-1">
        <div className="flex min-h-10 items-center gap-2.5">
          <input id="f-deed" type="checkbox" name="deed" value="1" defaultChecked={filters.deed} className="size-5 accent-green" />
          <label htmlFor="f-deed">Title deed (carta) available</label>
        </div>
        <div className="flex min-h-10 items-center gap-2.5">
          <input id="f-neg" type="checkbox" name="negotiable" value="0" defaultChecked={filters.excludeNegotiable} className="size-5 accent-green" />
          <label htmlFor="f-neg">Fixed price only</label>
        </div>
      </div>
      <div>
        <label htmlFor="f-lister" className="mb-2 block text-small font-semibold text-ink">
          Listed by
        </label>
        <Select id="f-lister" name="lister" defaultValue={filters.lister ?? ''}>
          <option value="">Anyone</option>
          {LISTER_TYPES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="f-added" className="mb-2 block text-small font-semibold text-ink">
          Added
        </label>
        <Select id="f-added" name="added" defaultValue={filters.added ? String(filters.added) : ''}>
          <option value="">Any time</option>
          {ADDED_WITHIN.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </Select>
      </div>
      <CheckGroup legend="Features" name="features" options={FEATURES} selected={filters.features} />
    </div>
  )
}

/** Desktop sidebar (applies as you change) and mobile bottom sheet (applies on "Show N results"). */
export function FiltersPanel(props: Props) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const root = `/property/${props.purpose === 'sale' ? 'for-sale' : 'to-rent'}`
  const desktopRef = useRef<HTMLFormElement>(null)
  const mobileRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [locPath, setLocPath] = useState<string | null>(props.location?.path ?? null)
  const [count, setCount] = useState<number>(props.total)
  const timer = useRef<number | null>(null)

  const target = (path: string | null) => (path ? `${root}/${path}` : root)

  function apply(form: HTMLFormElement | null, path: string | null) {
    if (!form) return
    router.push(`${target(path)}${toQuery(readForm(form, props.filters))}`, { scroll: false })
  }

  function refreshCount(path: string | null) {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      if (!mobileRef.current) return
      const qs = toQuery(readForm(mobileRef.current, props.filters)).replace(/^\?/, '')
      try {
        const res = await fetch(`/api/properties/count?purpose=${props.purpose}${path ? `&location=${encodeURIComponent(path)}` : ''}${qs ? `&${qs}` : ''}`)
        if (res.ok) setCount(((await res.json()) as { total: number }).total)
      } catch {
        // keep the previous count
      }
    }, 300)
  }

  useEffect(() => setCount(props.total), [props.total])

  return (
    <>
      <div className="sticky top-16 z-30 -mx-4 flex items-center gap-2 border-b border-border bg-white/95 px-4 py-2 backdrop-blur lg:hidden">
        <Button variant="secondary" size="md" className="flex-1" onClick={() => setOpen(true)}>
          <SlidersHorizontal /> Filters{props.activeCount ? ` (${props.activeCount})` : ''}
        </Button>
      </div>

      <aside className="hidden lg:block" aria-label="Filters">
        <form
          ref={desktopRef}
          key={pathname + toQuery(props.filters)}
          onChange={() => {
            if (timer.current) window.clearTimeout(timer.current)
            timer.current = window.setTimeout(() => apply(desktopRef.current, locPath), 350)
          }}
          onSubmit={(e) => {
            e.preventDefault()
            apply(desktopRef.current, locPath)
          }}
          className="rounded-lg border border-border bg-white p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-h3 font-bold">Filters</h2>
            {props.activeCount > 0 && (
              <a href={target(props.location?.path ?? null)} className="text-small font-semibold text-green hover:underline">
                Clear all
              </a>
            )}
          </div>
          <FilterFields
            {...props}
            onLocation={(p) => {
              setLocPath(p)
              apply(desktopRef.current, p)
            }}
          />
        </form>
      </aside>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        variant="sheet"
        footer={
          <div className="flex gap-2 [&>*]:flex-1">
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false)
                router.push(target(props.location?.path ?? null))
              }}
            >
              Clear all
            </Button>
            <Button
              onClick={() => {
                setOpen(false)
                apply(mobileRef.current, locPath)
              }}
            >
              Show {count.toLocaleString('en-ET')} result{count === 1 ? '' : 's'}
            </Button>
          </div>
        }
      >
        <form ref={mobileRef} onChange={() => refreshCount(locPath)} className={cn('pb-2')} onSubmit={(e) => e.preventDefault()}>
          <FilterFields
            {...props}
            onLocation={(p) => {
              setLocPath(p)
              refreshCount(p)
            }}
          />
        </form>
      </Dialog>
    </>
  )
}
