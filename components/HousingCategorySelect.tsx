'use client'

const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'

export function HousingCategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className='text-sm font-medium text-ink'>
      Property type <span className='text-ink'>*</span>
      <select
        name='category'
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        className={inp + ' cursor-pointer'}
      >
        <option value=''>Select a property type...</option>
          <option>Room to rent</option>
          <option>Flat to rent</option>
          <option>House to rent</option>
          <option>Studio to rent</option>
          <option>Property to buy</option>
          <option>Short-term let</option>
          <option>Homestay</option>
          <option>Commercial space</option>
      </select>
    </label>
  )
}
