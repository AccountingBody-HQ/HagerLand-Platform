'use client'
const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'
export function MoneyCategorySelect() {
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
        <option value='Money transfer'>Money transfer</option>
        <option value='Currency exchange'>Currency exchange</option>
        <option value='Accounting & Tax'>Accounting & Tax</option>
        <option value='Mortgage advice'>Mortgage advice</option>
        <option value='Business loans'>Business loans</option>
        <option value='Personal loans'>Personal loans</option>
        <option value='Insurance'>Insurance</option>
        <option value='Investment advice'>Investment advice</option>
        <option value='Pension advice'>Pension advice</option>
        <option value='Credit repair'>Credit repair</option>
      </select>
    </label>
  )
}
