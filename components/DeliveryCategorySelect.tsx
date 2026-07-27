'use client'
const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'
export function DeliveryCategorySelect() {
  return (
    <label className='text-sm font-medium text-ink'>
      Service type <span className='text-ink'>*</span>
      <select
        name='category'
        defaultValue=''
        required
        className={inp + ' cursor-pointer'}
      >
        <option value=''>Select a service type...</option>
        <option value='Courier services'>Courier services</option>
        <option value='Same-day/local delivery'>Same-day/local delivery</option>
        <option value='Removals & man-with-van'>Removals & man-with-van</option>
        <option value='Freight & haulage'>Freight & haulage</option>
        <option value='Cargo shipping'>Cargo shipping</option>
        <option value='Logistics & warehousing'>Logistics & warehousing</option>
        <option value='Bike/motorcycle courier'>Bike/motorcycle courier</option>
        <option value='International shipping'>International shipping</option>
      </select>
    </label>
  )
}
