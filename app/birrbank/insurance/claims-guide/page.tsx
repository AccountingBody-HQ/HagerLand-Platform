import type { Metadata } from 'next'
import Link from 'next/link'
import EmailCapture from '@/components/EmailCapture'
import { ChevronRight } from 'lucide-react'
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'How to Make an Insurance Claim in Ethiopia | BirrBank',
  description: 'Step-by-step guide to filing motor, health and property insurance claims with any NBE-licensed insurer in Ethiopia.',
}

const CLAIM_TYPES = [
  {
    type:'Motor insurance claim',
    href:'/insurance/motor',
    steps:[
      { step:'01', title:'Stop and secure the scene', body:'Do not move vehicles unless they are a danger to traffic. Turn on hazard lights. Call the police — a police report is mandatory for all motor claims in Ethiopia regardless of fault.' },
      { step:'02', title:'Collect evidence at the scene', body:'Photograph all vehicles, the road, traffic signs and any injuries. Get the name, phone number, licence plate and insurance details of all other parties. Get contact details from any witnesses.' },
      { step:'03', title:'Get the police report', body:'Obtain a copy of the police accident report (DA Form). This is required by all insurers. Do not accept a verbal police clearance — get the stamped document.' },
      { step:'04', title:'Notify your insurer within 48 hours', body:'Call your insurer claims line within 48 hours of the accident. Provide your policy number, accident date, location and a brief description. Late notification can result in a reduced or rejected claim.' },
      { step:'05', title:'Submit the claims documents', body:'Required documents: police report, your driving licence, vehicle registration (Libretto), insurance certificate, repair estimate from an approved garage, and completed claims form from your insurer.' },
      { step:'06', title:'Vehicle assessment and settlement', body:'Your insurer will appoint a loss assessor to inspect the vehicle. For third-party claims, the insurer settles directly with the claimant. For comprehensive claims, repair is authorised at an approved garage or a cash settlement is offered.' },
    ],
  },
  {
    type:'Health insurance claim',
    href:'/insurance/health',
    steps:[
      { step:'01', title:'Check if your hospital is on the panel', body:'If your insurer operates cashless hospitalisation, confirm your hospital is on the approved panel before admission. Treating at a non-panel hospital means you will need to pay upfront and claim reimbursement.' },
      { step:'02', title:'Get pre-authorisation for planned procedures', body:'For elective surgery or high-cost procedures, contact your insurer before treatment for pre-authorisation. Emergency admissions are usually covered without pre-authorisation but must be notified within 24 hours.' },
      { step:'03', title:'Collect original documents', body:'Keep all original receipts, discharge summaries, prescription records and laboratory reports. Insurers in Ethiopia require originals — photocopies are typically not accepted for reimbursement claims.' },
      { step:'04', title:'Submit within the claims deadline', body:'Most Ethiopian health insurers require claim submission within 90 days of treatment. Submit the completed claims form with all supporting documents to your insurer or employer HR department.' },
    ],
  },
  {
    type:'Property insurance claim',
    href:'/insurance/property',
    steps:[
      { step:'01', title:'Secure the property and prevent further loss', body:'Take immediate steps to prevent further damage — cover a damaged roof, board up broken windows, drain standing water. Failing to mitigate further loss can reduce your settlement.' },
      { step:'02', title:'Report to the authorities', body:'For fire, report to the fire brigade and get their attendance report. For theft or vandalism, report to the police and get a police report. Both documents are required by all Ethiopian property insurers.' },
      { step:'03', title:'Notify your insurer immediately', body:'Contact your insurer as soon as possible after the loss. Provide your policy number, the date and cause of loss, and an initial estimate of damage. Do not commence repairs without insurer approval.' },
      { step:'04', title:'Document everything before clearing', body:'Photograph or video all damage before any cleaning or clearing. List all damaged or lost items with estimated values. Keep any damaged items until the loss assessor has inspected them.' },
      { step:'05', title:'Loss assessment and settlement', body:'Your insurer will appoint a loss assessor. Get your own independent repair estimates. Once the assessment is agreed, the insurer will either authorise repairs directly or offer a cash settlement.' },
    ],
  },
]

export default function ClaimsGuidePage() {
  return (
    <main className="bg-white flex-1">
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none" style={{background: 'radial-gradient(circle at top right, #fff 0%, transparent 60%)'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-0">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-6"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }}>
            Insurance — Claims Guide
          </div>
          <h1 className="font-bold text-white mb-4"
            style={{ fontSize:'clamp(38px, 4.5vw, 56px)', letterSpacing:'-0.025em', lineHeight:1.08 }}>
            How to make an insurance claim in Ethiopia.
          </h1>
          <p className="text-white/65 mb-8" style={{ fontSize:'16px', lineHeight:1.8, maxWidth:'520px' }}>
            Step-by-step guides for motor, health and property claims — what to do, what documents you need, and how to avoid having your claim reduced or rejected.
          </p>
          <div className="flex flex-wrap gap-3 mb-10">
            <Link href="/birrbank/insurance/motor" className="hero-btn hero-btn-primary">
              Motor insurance
            </Link>
            <Link href="/birrbank/insurance/health" className="hero-btn hero-btn-secondary">
              Health insurance
            </Link>
          </div>
          <div className="grid grid-cols-3 mt-2 pt-8 border-t border-white/20">
            {[
              { value:'3', label:'Claim types covered' },
              { value:'15', label:'Step-by-step actions' },
              { value:'Free', label:'No broker required' },
            ].map(s => (
              <div key={s.label} className="text-center py-6 border-r border-white/20 last:border-r-0">
                <div className="font-mono font-black text-white mb-1" style={{ fontSize:'clamp(22px, 3vw, 36px)', letterSpacing:'-1px' }}>{s.value}</div>
                <div className="text-xs font-semibold text-white/40">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {CLAIM_TYPES.map(ct => (
        <section key={ct.type} style={{ background: CLAIM_TYPES.indexOf(ct) % 2 === 0 ? '#ffffff' : '#F4F5F3', padding:'96px 0', borderTop:'1px solid #E4E6E3' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10">
              <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>Step-by-step guide</p>
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-slate-950"
                  style={{ fontSize:'clamp(22px, 3vw, 34px)', letterSpacing:'-0.5px' }}>
                  {ct.type}
                </h2>
                <Link href={ct.href} className="text-xs font-bold" style={{ color:'#1C7C4C' }}>
                  Compare products <ChevronRight size={11} className="inline" />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {ct.steps.map(s => (
                <div key={s.step} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-green/40 hover:shadow-lg transition-all">
                  <div style={{ height:4, background:'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
                  <div style={{ padding:'28px 24px' }}>
                    <p className="font-mono font-black mb-3" style={{ fontSize:'32px', color:'#E4E6E3', lineHeight:1 }}>{s.step}</p>
                    <p className="font-bold text-slate-900 mb-3" style={{ fontSize:'15px' }}>{s.title}</p>
                    <p className="text-sm text-slate-500" style={{ lineHeight:1.75 }}>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section style={{ background:'#1C7C4C', padding:'72px 0', borderTop:'1px solid #155F3A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color:'#ffffff' }}>Compare providers</p>
            <h3 className="font-bold mb-2" style={{ fontSize:'clamp(22px, 2.5vw, 30px)', color:'#ffffff', letterSpacing:'-0.5px' }}>
              Already have a claim? Compare your next policy.
            </h3>
            <p style={{ color:'#5B6472', fontSize:'15px', lineHeight:1.75, maxWidth:480 }}>
              BirrBank compares premiums across all NBE-licensed insurers — free, with no broker involved.
            </p>
          </div>
          <Link href="/birrbank/insurance" className="font-bold rounded-full shrink-0"
            style={{ fontSize:14, padding:'14px 28px', background:'#1C7C4C', color:'#fff', whiteSpace:'nowrap' }}>
            Compare all insurance
          </Link>
        </div>
      </section>

      <section style={{ background:'#ffffff', padding:'96px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#1C7C4C' }}>Stay informed</p>
            <h2 className="font-bold text-slate-950 mb-5"
              style={{ fontSize:'clamp(30px, 3.5vw, 42px)', letterSpacing:'-0.5px', lineHeight:1.1 }}>
              Insurance updates, direct to your inbox.
            </h2>
            <p className="text-slate-500 mb-8" style={{ fontSize:'15px', lineHeight:1.85 }}>
              Get notified when insurers update their premiums, launch new products or when claims processes change.
            </p>
            <p className="text-xs text-slate-500 font-medium pt-5 border-t border-slate-100">Free forever · No credit card · Unsubscribe anytime</p>
          </div>
          <EmailCapture />
        </div>
      </section>
    </main>
  )
}
