'use client'
import { useState } from 'react'

export default function EmailCapture() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit() {
    if (!email || !email.includes('@')) {
      setStatus('error')
      setMessage('Please enter a valid email address.')
      return
    }
    setStatus('loading')
    try {
      const res = await fetch('/api/birrbank-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMessage('You are subscribed. Welcome to BirrBank.')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
      <div style={{ height: 4, background: 'linear-gradient(90deg, #1C7C4C, #155F3A)' }} />
      <div className="p-8">
        <h3 className="font-bold text-slate-900 mb-2" style={{fontSize:'20px'}}>Join Ethiopian finance professionals</h3>
        <p className="text-slate-500 text-sm mb-6">Weekly rate alerts, market moves and financial intelligence — free.</p>

        {status === 'success' ? (
          <div className="rounded-xl border border-green/30 bg-green-soft px-4 py-4 text-center">
            <p className="font-bold text-sm mb-1" style={{color:'#1C7C4C'}}>You are in.</p>
            <p className="text-xs" style={{color:'#155F3A'}}>{message}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setStatus('idle'); setMessage('') }}
              placeholder="your@email.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-green focus:ring-2 focus:ring-green/20"
            />
            {status === 'error' && (
              <p className="text-red-500 text-xs px-1">{message}</p>
            )}
            <button
              onClick={handleSubmit}
              disabled={status === 'loading'}
              className="w-full font-bold rounded-xl py-3 text-white transition-colors disabled:opacity-60"
              style={{background:'#1C7C4C', fontSize:'15px'}}
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe free →'}
            </button>
          </div>
        )}
        <p className="text-xs text-slate-400 mt-4 text-center">No spam. Unsubscribe anytime.</p>
      </div>
    </div>
  )
}
