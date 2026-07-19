'use client'

const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'

export function MoneyCategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className='text-sm font-medium text-ink'>
      Service type <span className='text-ink'>*</span>
      <select
        name='category'
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        className={inp + ' cursor-pointer'}
      >
        <option value=''>Select a service type...</option>
          <option>Money transfer</option>
          <option>Currency exchange</option>
          <option>Accounting & Tax</option>
          <option>Mortgage advice</option>
          <option>Business loans</option>
          <option>Personal loans</option>
          <option>Insurance</option>
          <option>Investment advice</option>
          <option>Pension advice</option>
          <option>Credit repair</option>
      </select>
    </label>
  )
}
