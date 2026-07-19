'use client'

const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'

export function CarsCategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className='text-sm font-medium text-ink'>
      Vehicle / service type <span className='text-ink'>*</span>
      <select
        name='category'
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        className={inp + ' cursor-pointer'}
      >
        <option value=''>Select a vehicle / service type...</option>
          <option>Car for sale</option>
          <option>Van for sale</option>
          <option>Car hire</option>
          <option>Van hire</option>
          <option>Taxi & private hire</option>
          <option>Driving school</option>
          <option>MOT & servicing</option>
          <option>Body repair & paint</option>
          <option>Tyres & exhausts</option>
          <option>Car parts & accessories</option>
      </select>
    </label>
  )
}
