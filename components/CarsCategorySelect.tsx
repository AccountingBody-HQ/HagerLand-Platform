'use client'
const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'
export function CarsCategorySelect() {
  return (
    <label className='text-sm font-medium text-ink'>
      Vehicle / service type <span className='text-ink'>*</span>
      <select
        name='category'
        defaultValue=''
        required
        className={inp + ' cursor-pointer'}
      >
        <option value=''>Select a vehicle type...</option>
        <option value='Car for sale'>Car for sale</option>
        <option value='Van for sale'>Van for sale</option>
        <option value='Car hire'>Car hire</option>
        <option value='Van hire'>Van hire</option>
        <option value='Taxi & private hire'>Taxi & private hire</option>
        <option value='Driving school'>Driving school</option>
        <option value='MOT & servicing'>MOT & servicing</option>
        <option value='Body repair & paint'>Body repair & paint</option>
        <option value='Tyres & exhausts'>Tyres & exhausts</option>
        <option value='Car parts & accessories'>Car parts & accessories</option>
      </select>
    </label>
  )
}
