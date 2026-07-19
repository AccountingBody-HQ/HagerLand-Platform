'use client'
import { useState } from 'react'

const CATEGORIES = [
  { group: 'Food & Hospitality', items: ['Ethiopian Restaurant','Eritrean Restaurant','Cafe & Coffee Shop','Catering & Events','Food Delivery','Bakery & Pastry'] },
  { group: 'Professional Services', items: ['Accounting & Tax','Legal Services','Financial Advice','Immigration & Visa','Mortgage & Property','Insurance','Business Consulting'] },
  { group: 'Health & Wellbeing', items: ['GP & Medical','Dentist','Pharmacy','Mental Health & Counselling','Physiotherapy','Alternative Medicine'] },
  { group: 'Beauty & Personal Care', items: ['Hair Salon & Braiding','Barbershop','Nail & Beauty Salon','Skincare & Cosmetics'] },
  { group: 'Retail & Trade', items: ['African & Ethiopian Grocery','Fashion & Clothing','Electronics & Mobile','Home & Furniture','Car Sales & Parts'] },
  { group: 'Transport & Travel', items: ['Taxi & Private Hire','Travel Agency','Driving School','Courier & Delivery'] },
  { group: 'Education & Training', items: ['Tutoring & Education','Language Classes','Skills & Vocational Training','Childcare & Nursery'] },
  { group: 'Creative & Media', items: ['Photography & Videography','Music & Entertainment','Graphic Design & Printing','Marketing & PR','Web & Tech Services'] },
  { group: 'Community & Faith', items: ['Church & Faith Organisation','Community Association','Charity & Non-profit','Events & Cultural'] },
  { group: 'Property', items: ['Estate Agent','Letting Agent','Property Management','Construction & Renovation','Cleaning Services'] },
]

const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green'

export function CategorySelect() {
  const [value, setValue] = useState('')
  const [other, setOther] = useState('')

  return (
    <div className='flex flex-col gap-4'>
      <label className='text-sm font-medium text-ink'>
        Category / industry <span className='text-red-500'>*</span>
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
