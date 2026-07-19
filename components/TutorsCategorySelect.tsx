'use client'

const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'

export function TutorsCategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className='text-sm font-medium text-ink'>
      Subject area <span className='text-ink'>*</span>
      <select
        name='category'
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        className={inp + ' cursor-pointer'}
      >
        <option value=''>Select a subject area...</option>
          <option>Maths</option>
          <option>English & Literacy</option>
          <option>Science</option>
          <option>Amharic language</option>
          <option>Tigrinya language</option>
          <option>Afaan Oromo language</option>
          <option>Music & instruments</option>
          <option>Art & design</option>
          <option>IT & computing</option>
          <option>Business studies</option>
          <option>University preparation</option>
          <option>11+ & entrance exams</option>
          <option>Special educational needs</option>
      </select>
    </label>
  )
}
