import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import Link from 'next/link'

const sections = [
  {
    href: '/business/edit-link', label: 'Business', sub: 'Shops, restaurants & services',
    icon: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'
  },
  {
    href: '/jobs/edit-link', label: 'Jobs', sub: 'Employment & opportunities',
    icon: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>'
  },
  {
    href: '/housing/edit-link', label: 'Housing', sub: 'Rooms, flats & properties',
    icon: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'
  },
  {
    href: '/money/edit-link', label: 'Money', sub: 'Financial services',
    icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>'
  },
  {
    href: '/cars/edit-link', label: 'Cars', sub: 'Vehicles & transport',
    icon: '<rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>'
  },
  {
    href: '/tutors/edit-link', label: 'Tutors', sub: 'Teaching & education',
    icon: '<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>'
  },
  {
    href: '/community/edit-link', label: 'Community', sub: 'Organisations & groups',
    icon: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>'
  },
  {
    href: '/events/edit-link', label: 'Events', sub: 'Celebrations & gatherings',
    icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'
  },
]

export default function UniversalEditLinkPage() {
  return (
    <main className='min-h-screen bg-bg flex flex-col'>
      <SiteNav />
      <section className='max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 w-full'>
        <div className='text-center mb-10'>
          <h1 className='text-2xl font-bold text-ink mb-2'>Edit your listing</h1>
          <p className='text-muted text-sm'>Select the section your listing belongs to, then enter your email to receive your edit link.</p>
        </div>
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
          {sections.map((s) => (
            <Link key={s.href} href={s.href}
              className='flex flex-col items-center gap-3 bg-white border border-border rounded-2xl px-4 py-5 hover:border-green hover:shadow-sm transition-all group text-center'>
              <div className='w-10 h-10 rounded-xl bg-green-soft flex items-center justify-center group-hover:bg-green transition-colors'>
                <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.75' className='text-green group-hover:text-white transition-colors' dangerouslySetInnerHTML={{__html: s.icon}} />
              </div>
              <div>
                <p className='text-sm font-bold text-ink group-hover:text-green transition-colors'>{s.label}</p>
                <p className='text-[11px] text-muted mt-0.5 leading-tight'>{s.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
