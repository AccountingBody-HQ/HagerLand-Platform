'use client'
const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'
export function MadeInEthiopiaCategorySelect() {
  return (
    <label className='text-sm font-medium text-ink'>
      Product category <span className='text-ink'>*</span>
      <select
        name='category'
        defaultValue=''
        required
        className={inp + ' cursor-pointer'}
      >
        <option value=''>Select a category...</option>
        <option value='Coffee'>Coffee</option>
        <option value='Honey & spices'>Honey & spices</option>
        <option value='Textiles & fabrics'>Textiles & fabrics</option>
        <option value='Leather goods'>Leather goods</option>
        <option value='Crafts & art'>Crafts & art</option>
        <option value='Food products'>Food products</option>
        <option value='Clothing'>Clothing</option>
        <option value='Other'>Other</option>
      </select>
    </label>
  )
}
