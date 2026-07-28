import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'BirrBank® — Ethiopia\'s Financial Directory | HagerLand',
  description: 'Compare savings rates, FX rates, insurance, markets and commodities across all NBE-licensed institutions in Ethiopia.',
}

interface Section {
  href: string
  label: string
  description: string
  icon: string
}

const SECTIONS: Section[] = [
  { href: '/birrbank/banking', label: 'Banking', description: 'Savings, loans, FX rates and digital services across every commercial bank.',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>` },
  { href: '/birrbank/institutions', label: 'Institutions', description: 'Every NBE-licensed bank, insurer, microfinance and payment operator.',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 21h18M4 21V9l8-6 8 6v12M9 21V13h6v8"/></svg>` },
  { href: '/birrbank/insurance', label: 'Insurance', description: 'Motor, life, health, property and travel cover compared side by side.',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>` },
  { href: '/birrbank/markets', label: 'Markets', description: 'Equities, bonds and IPOs on the Ethiopian Securities Exchange.',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18h18M7 14l4-4 3 3 5-6"/></svg>` },
  { href: '/birrbank/commodities', label: 'Commodities', description: 'Coffee, sesame and grain prices from the Ethiopian Commodity Exchange.',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>` },
  { href: '/money', label: 'Money', description: 'Financial services for the diaspora community.',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>` },
]

export default function BirrBankHubPage() {
  return (
    <main className="bg-white flex-1">
      {/* HERO */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2.5 text-white/50 text-[11px] font-bold tracking-[0.18em] uppercase mb-8">ሃገር <span className="w-1 h-1 rounded-full bg-white/30" translate="no" /> Homeland <span className="w-1 h-1 rounded-full bg-white/30" translate="no" /> BirrBank<span translate="no">&reg;</span></p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">Ethiopia&rsquo;s<br /><span className="text-white/60">Financial</span><br /><span className="text-white/60">Directory</span></h1>
            <p className="text-white/65 text-lg sm:text-xl max-w-xl leading-relaxed">Compare savings rates, FX rates, insurance, markets and commodities across all NBE-licensed institutions.</p>
          </div>
        </div>
      </section>

      {/* SECTION CARDS */}
      <section className="bg-white flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-green mb-3">Browse BirrBank</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-ink">Pick a section to get started</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SECTIONS.map((section) => (
              <Link key={section.href} href={section.href}
                className="group bg-white border border-border rounded-2xl p-6 hover:border-green/50 hover:shadow-lg transition-all duration-200 flex flex-col">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 shrink-0 bg-green-soft text-green"
                  dangerouslySetInnerHTML={{ __html: section.icon }} />
                <h3 className="font-bold text-base mb-1.5 transition-colors text-ink group-hover:text-green">
                  {section.label}
                </h3>
                <p className="text-sm text-muted leading-relaxed flex-1">{section.description}</p>
                <div className="flex items-center justify-end mt-5 pt-4 border-t border-border/60">
                  <span className="w-7 h-7 rounded-full bg-green-soft flex items-center justify-center transition-all duration-300 group-hover:bg-green">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green group-hover:text-white transition-colors"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
