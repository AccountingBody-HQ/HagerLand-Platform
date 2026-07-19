'use client'
const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'
export function CommunityCategorySelect() {
  return (
    <label className='text-sm font-medium text-ink'>
      Organisation type <span className='text-ink'>*</span>
      <select
        name='category'
        defaultValue=''
        required
        className={inp + ' cursor-pointer'}
      >
        <option value=''>Select a organisation type...</option>
        <option value='Community association'>Community association</option>
        <option value='Church & faith group'>Church & faith group</option>
        <option value='Charity & non-profit'>Charity & non-profit</option>
        <option value='Cultural organisation'>Cultural organisation</option>
        <option value='Sports club'>Sports club</option>
        <option value='Youth group'>Youth group</option>
        <option value="Women's group">Women&apos;s group</option>
        <option value='Elders group'>Elders group</option>
        <option value='Support group'>Support group</option>
        <option value='Political & civic'>Political & civic</option>
      </select>
    </label>
  )
}
