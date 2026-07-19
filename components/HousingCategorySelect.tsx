'use client'
const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'
export function HousingCategorySelect() {
  return (
    <label className='text-sm font-medium text-ink'>
      Property type <span className='text-ink'>*</span>
      <select
        name='category'
        defaultValue=''
        required
        className={inp + ' cursor-pointer'}
      >
        <option value=''>Select a property type...</option>
        <option value='Room to rent'>Room to rent</option>
        <option value='Flat to rent'>Flat to rent</option>
        <option value='House to rent'>House to rent</option>
        <option value='Studio to rent'>Studio to rent</option>
        <option value='Property to buy'>Property to buy</option>
        <option value='Short-term let'>Short-term let</option>
        <option value='Homestay'>Homestay</option>
        <option value='Commercial space'>Commercial space</option>
      </select>
    </label>
  )
}
