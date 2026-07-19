'use client'

const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'

export function CommunityCategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className='text-sm font-medium text-ink'>
      Organisation type <span className='text-ink'>*</span>
      <select
        name='category'
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        className={inp + ' cursor-pointer'}
      >
        <option value=''>Select a organisation type...</option>
          <option>Community association</option>
          <option>Church & faith group</option>
          <option>Charity & non-profit</option>
          <option>Cultural organisation</option>
          <option>Sports club</option>
          <option>Youth group</option>
          <option>Women&apos;s group</option>
          <option>Elders group</option>
          <option>Support group</option>
          <option>Political & civic</option>
      </select>
    </label>
  )
}
