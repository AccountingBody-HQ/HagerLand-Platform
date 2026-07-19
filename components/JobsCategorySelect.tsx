'use client'
const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'
export function JobsCategorySelect() {
  return (
    <label className='text-sm font-medium text-ink'>
      Job type <span className='text-ink'>*</span>
      <select
        name='category'
        defaultValue=''
        required
        className={inp + ' cursor-pointer'}
      >
        <option value=''>Select a job type...</option>
        <option value='Full-time'>Full-time</option>
        <option value='Part-time'>Part-time</option>
        <option value='Contract'>Contract</option>
        <option value='Freelance'>Freelance</option>
        <option value='Internship'>Internship</option>
        <option value='Volunteer'>Volunteer</option>
        <option value='Apprenticeship'>Apprenticeship</option>
      </select>
    </label>
  )
}
