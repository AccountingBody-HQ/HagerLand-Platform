'use client'
import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, X, ChevronRight, LayoutGrid, List } from 'lucide-react'

type CoverageLevel = 'full' | 'partial' | 'basic'
interface Institution {
  slug: string; name: string; type: string; swift_code: string | null
  website_url: string | null; coverage_level: CoverageLevel | null
  nbe_licence_date: string | null; nbe_licence_number: string | null
  branches_count: number | null; operational_status: string | null
  hq_region: string | null; service_type: string | null
  phone: string | null; email: string | null; is_active: boolean
  description: string | null; founded_year: number | null
}

const TYPE_LABELS: Record<string,string> = {
  bank:'Bank', insurer:'Insurer', microfinance:'Microfinance',
  payment_operator:'Payment', money_transfer:'Remittance', fx_bureau:'FX Bureau',
  capital_goods_finance:'Capital Goods', reinsurer:'Reinsurer', investment_bank:'Investment Bank',
}
const TYPE_COLORS: Record<string,string> = {
  bank:'#1C7C4C', insurer:'#8b5cf6', microfinance:'#06b6d4',
  payment_operator:'#f59e0b', money_transfer:'#ec4899', fx_bureau:'#10b981',
  capital_goods_finance:'#f97316', reinsurer:'#5B6472', investment_bank:'#5B6472',
}
const TYPE_TABS = [
  { value:'all', label:'All' },
  { value:'bank', label:'Banks' },
  { value:'microfinance', label:'Microfinance' },
  { value:'insurer', label:'Insurance' },
  { value:'payment_operator', label:'Payment' },
  { value:'money_transfer', label:'Remittance' },
  { value:'fx_bureau', label:'FX Bureaux' },
  { value:'capital_goods_finance', label:'Capital Goods' },
]

function TypeBadge({ type }: { type: string }) {
  const color = TYPE_COLORS[type] ?? '#5B6472'
  return (
    <span className="text-xs font-semibold rounded-full px-2.5 py-0.5"
      style={{ background:`${color}15`, color }}>
      {TYPE_LABELS[type] ?? type}
    </span>
  )
}

function CoverageBadge({ active, coverage }: { active: boolean; coverage: CoverageLevel | null }) {
  if (!active) return (
    <span className="text-xs font-semibold rounded-full px-2.5 py-0.5 bg-slate-100 text-slate-400 ring-1 ring-slate-200">Coming Soon</span>
  )
  if (coverage === 'full') return (
    <span className="text-xs font-semibold rounded-full px-2.5 py-0.5 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Verified</span>
  )
  if (coverage === 'partial') return (
    <span className="text-xs font-semibold rounded-full px-2.5 py-0.5 bg-amber-50 text-amber-700 ring-1 ring-amber-200">Partial</span>
  )
  return (
    <span className="text-xs font-semibold rounded-full px-2.5 py-0.5 bg-green-soft text-green ring-1 ring-green/30">Profiled</span>
  )
}

function GridCard({ inst }: { inst: Institution }) {
  const color = TYPE_COLORS[inst.type] ?? '#5B6472'
  const licenceYear = inst.nbe_licence_date ? new Date(inst.nbe_licence_date).getFullYear() : inst.founded_year ?? null
  const metric = inst.branches_count ? `${inst.branches_count} branches`
    : inst.swift_code ?? inst.nbe_licence_number ?? inst.hq_region ?? null

  const card = (
    <div className={`group relative bg-white border rounded-xl overflow-hidden transition-all duration-200 flex flex-col h-full ${inst.is_active ? 'border-slate-200 hover:border-l-4 hover:border-l-green hover:border-green/30 hover:shadow-lg cursor-pointer' : 'border-slate-200 opacity-60'}`}
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ height: 4, background: inst.is_active ? `linear-gradient(90deg, ${color}, ${color}cc)` : '#e2e8f0' }} />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm leading-snug mb-1 line-clamp-2 ${inst.is_active ? 'text-slate-900 group-hover:text-green-dark' : 'text-slate-500'} transition-colors`}>
              {inst.name}
            </p>
            <p className="text-xs text-slate-400 font-mono truncate">{metric ?? ' '}</p>
          </div>
          {inst.is_active && <ChevronRight size={14} className="text-slate-300 group-hover:text-green shrink-0 mt-0.5 transition-colors" />}
        </div>
        {inst.description && inst.is_active && (
          <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">{inst.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <TypeBadge type={inst.type} />
          <div className="flex items-center gap-2">
            {licenceYear && <span className="text-xs text-slate-400">{licenceYear}</span>}
            <CoverageBadge active={inst.is_active} coverage={inst.coverage_level} />
          </div>
        </div>
      </div>
    </div>
  )

  if (!inst.is_active) return card
  return <Link href={`/birrbank/institutions/${inst.slug}`} className="flex flex-col h-full">{card}</Link>
}

function ListRow({ inst }: { inst: Institution }) {
  const color = TYPE_COLORS[inst.type] ?? '#5B6472'
  const licenceYear = inst.nbe_licence_date ? new Date(inst.nbe_licence_date).getFullYear() : inst.founded_year ?? null

  const row = (
    <div className={`grid items-center py-3 px-4 transition-all ${inst.is_active ? 'hover:bg-slate-50 cursor-pointer' : 'opacity-50'}`}
      style={{ borderBottom: '1px solid #f1f5f9', gridTemplateColumns: '36px 1fr 130px 60px 90px 120px 20px' }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
        style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
        {(TYPE_LABELS[inst.type] ?? '?').slice(0,2).toUpperCase()}
      </div>
      <div className="min-w-0 px-3">
        <p className={`font-semibold text-sm truncate ${inst.is_active ? 'text-slate-900' : 'text-slate-500'}`}>{inst.name}</p>
        {inst.swift_code && <p className="text-xs text-slate-400 font-mono">{inst.swift_code}</p>}
      </div>
      <div><TypeBadge type={inst.type} /></div>
      <div className="text-xs text-slate-400 text-right">{licenceYear ?? '—'}</div>
      <div className="text-xs text-slate-400 text-right">{inst.branches_count ? `${inst.branches_count}` : '—'}</div>
      <div className="flex justify-end"><CoverageBadge active={inst.is_active} coverage={inst.coverage_level} /></div>
      <div className="flex justify-end">{inst.is_active ? <ChevronRight size={14} className="text-slate-300" /> : null}</div>
    </div>
  )

  if (!inst.is_active) return <div>{row}</div>
  return <Link href={`/birrbank/institutions/${inst.slug}`}>{row}</Link>
}

export default function InstitutionsClient({ institutions }: { institutions: Institution[] }) {
  const searchParams = useSearchParams()
  const typeParam = searchParams.get('type') ?? 'all'
  const [search, setSearch] = useState('')
  const [type, setType] = useState(typeParam)
  const [view, setView] = useState<'grid'|'list'>('grid')

  useEffect(() => { setType(typeParam) }, [typeParam])

  const typeCounts = useMemo(() => {
    const counts: Record<string,number> = {}
    for (const i of institutions) counts[i.type] = (counts[i.type] ?? 0) + 1
    return counts
  }, [institutions])

  const filtered = useMemo(() => {
    let result = [...institutions]
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.swift_code?.toLowerCase().includes(q) ?? false) ||
        (i.nbe_licence_number?.toLowerCase().includes(q) ?? false) ||
        (i.hq_region?.toLowerCase().includes(q) ?? false)
      )
    }
    if (type !== 'all') result = result.filter(i => i.type === type)
    return result.sort((a, b) => {
      if (a.is_active && !b.is_active) return -1
      if (!a.is_active && b.is_active) return 1
      return a.name.localeCompare(b.name)
    })
  }, [institutions, search, type])

  const activeFiltered = filtered.filter(i => i.is_active).length

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, SWIFT code, licence number, region..."
            className="w-full pl-11 pr-10 py-3 bg-white border border-slate-200 focus:border-green focus:ring-2 focus:ring-green/20 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all" />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              <X size={15} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl shrink-0" style={{ background: '#f1f5f9' }}>
          <button onClick={() => setView('grid')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
            style={view === 'grid' ? { background: '#fff', color: '#1C7C4C', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : { color: '#5B6472' }}>
            <LayoutGrid size={14} /> Grid
          </button>
          <button onClick={() => setView('list')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
            style={view === 'list' ? { background: '#fff', color: '#1C7C4C', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' } : { color: '#5B6472' }}>
            <List size={14} /> List
          </button>
        </div>
      </div>

      <div className="relative mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {TYPE_TABS.map(tab => (
            <button key={tab.value} onClick={() => setType(tab.value)}
              className="px-4 py-2 rounded-full text-sm font-semibold transition-all shrink-0"
              style={type === tab.value
                ? { background: '#1C7C4C', color: '#fff' }
                : { background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' }}>
              {tab.label}
              {tab.value === 'all'
                ? <span className="ml-1.5 text-xs opacity-70">({institutions.length})</span>
                : typeCounts[tab.value]
                ? <span className="ml-1.5 text-xs opacity-70">({typeCounts[tab.value]})</span>
                : null}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-800">{activeFiltered}</span> profiled
          {filtered.length - activeFiltered > 0 && (
            <span className="text-slate-400"> · {filtered.length - activeFiltered} coming soon</span>
          )}
        </p>
        {(search || type !== 'all') && (
          <button onClick={() => { setSearch(''); setType('all') }}
            className="text-xs font-semibold text-green hover:text-green-dark transition-colors">
            Clear filters
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-8 pb-6 border-b border-slate-100">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Coverage:</span>
        {[
          { label:'Verified', cls:'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
          { label:'Partial', cls:'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
          { label:'Profiled', cls:'bg-green-soft text-green ring-1 ring-green/30' },
          { label:'Coming Soon', cls:'bg-slate-100 text-slate-400 ring-1 ring-slate-200' },
        ].map(b => (
          <span key={b.label} className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>
        ))}
      </div>

      {filtered.length > 0 ? (
        view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(inst => <GridCard key={inst.slug} inst={inst} />)}
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-slate-200">
            <div style={{ height: 4, background: 'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
            <div className="grid px-4 py-2 border-b border-slate-100"
              style={{ background: '#f8fafc', gridTemplateColumns: '36px 1fr 130px 60px 90px 120px 20px' }}>
              <div />
              <div className="px-3 text-xs font-black text-slate-400 uppercase tracking-widest">Institution</div>
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Type</div>
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest text-right">Est.</div>
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest text-right">Branches</div>
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest text-right">Coverage</div>
              <div />
            </div>
            <div className="divide-y divide-slate-50 px-2 py-1">
              {filtered.map(inst => <ListRow key={inst.slug} inst={inst} />)}
            </div>
          </div>
        )
      ) : (
        <div className="text-center py-24 text-slate-400">
          <p className="text-5xl mb-4">&#127968;</p>
          <p className="font-semibold text-slate-600 text-lg">No institutions match your search</p>
          <p className="text-sm mt-2">Try a different name or filter</p>
        </div>
      )}
    </div>
  )
}
