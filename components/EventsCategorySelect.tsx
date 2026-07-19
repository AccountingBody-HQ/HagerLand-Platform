'use client'

const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'

export function EventsCategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className='text-sm font-medium text-ink'>
      Event type <span className='text-ink'>*</span>
      <select
        name='category'
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        className={inp + ' cursor-pointer'}
      >
        <option value=''>Select a event type...</option>
          <option>Music & concert</option>
          <option>Cultural festival</option>
          <option>Religious celebration</option>
          <option>Community meeting</option>
          <option>Sports event</option>
          <option>Food & dining</option>
          <option>Networking</option>
          <option>Wedding & celebration</option>
          <option>Fundraiser</option>
          <option>Exhibition & art</option>
          <option>Conference & seminar</option>
          <option>Online event</option>
      </select>
    </label>
  )
}
