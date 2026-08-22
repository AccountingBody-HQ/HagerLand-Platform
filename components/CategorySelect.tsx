'use client'
import { useState } from 'react'
import { CATEGORIES } from '@/lib/categories'

const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green'

export function CategorySelect() {
  const [value, setValue] = useState('')
  const [other, setOther] = useState('')

  return (
    <div className='flex flex-col gap-4'>
      <label className='text-sm font-medium text-ink'>
        Category / industry <span className='text-ink'>*</span>
        <select
          name='sic_description'
          value={value}
          required
          onChange={e => setValue(e.target.value)}
          className={inp + ' cursor-pointer'}
        >
          <option value=''>Select a category...</option>
          {CATEGORIES.map(({ group, items }) => (
            <optgroup key={group} label={group}>
              {items.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </optgroup>
          ))}
          <option value='Other'>Other (please specify)</option>
        </select>
      </label>
      {value === 'Other' && (
        <label className='text-sm font-medium text-ink'>
          Please specify your category *
          <input
            name='sic_description_other'
            value={other}
            onChange={e => setOther(e.target.value)}
            required
            className={inp}
            placeholder='e.g. Funeral Services'
          />
        </label>
      )}
    </div>
  )
}
