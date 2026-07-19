'use client'
const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'
export function EventsCategorySelect() {
  return (
    <label className='text-sm font-medium text-ink'>
      Event type <span className='text-ink'>*</span>
      <select
        name='category'
        defaultValue=''
        required
        className={inp + ' cursor-pointer'}
      >
        <option value=''>Select a event type...</option>
        <option value='Music & concert'>Music & concert</option>
        <option value='Cultural festival'>Cultural festival</option>
        <option value='Religious celebration'>Religious celebration</option>
        <option value='Community meeting'>Community meeting</option>
        <option value='Sports event'>Sports event</option>
        <option value='Food & dining'>Food & dining</option>
        <option value='Networking'>Networking</option>
        <option value='Wedding & celebration'>Wedding & celebration</option>
        <option value='Fundraiser'>Fundraiser</option>
        <option value='Exhibition & art'>Exhibition & art</option>
        <option value='Conference & seminar'>Conference & seminar</option>
        <option value='Online event'>Online event</option>
      </select>
    </label>
  )
}
