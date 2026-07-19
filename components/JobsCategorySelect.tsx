'use client'

const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'

export function JobsCategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className='text-sm font-medium text-ink'>
      Job type <span className='text-ink'>*</span>
      <select
        name='category'
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        className={inp + ' cursor-pointer'}
      >
        <option value=''>Select a job type...</option>
          <option>Full-time</option>
          <option>Part-time</option>
          <option>Contract</option>
          <option>Freelance</option>
          <option>Internship</option>
          <option>Volunteer</option>
          <option>Apprenticeship</option>
      </select>
    </label>
  )
}
