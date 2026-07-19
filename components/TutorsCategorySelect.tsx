'use client'
const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'
export function TutorsCategorySelect() {
  return (
    <label className='text-sm font-medium text-ink'>
      Subject area <span className='text-ink'>*</span>
      <select
        name='category'
        defaultValue=''
        required
        className={inp + ' cursor-pointer'}
      >
        <option value=''>Select a subject...</option>
        <option value='Maths'>Maths</option>
        <option value='English & Literacy'>English & Literacy</option>
        <option value='Science'>Science</option>
        <option value='Amharic language'>Amharic language</option>
        <option value='Tigrinya language'>Tigrinya language</option>
        <option value='Afaan Oromo language'>Afaan Oromo language</option>
        <option value='Music & instruments'>Music & instruments</option>
        <option value='Art & design'>Art & design</option>
        <option value='IT & computing'>IT & computing</option>
        <option value='Business studies'>Business studies</option>
        <option value='University preparation'>University preparation</option>
        <option value='11+ & entrance exams'>11+ & entrance exams</option>
        <option value='Special educational needs'>Special educational needs</option>
      </select>
    </label>
  )
}
