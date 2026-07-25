'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { approveListing, rejectListing, approveMany } from '@/app/roodber8/review/actions'

const C = {
  panel: '#0d1424', border: '#1a2238', text: '#ffffff', muted: '#94a3b8',
  green: '#1C7C4C', gold: '#B8862E', danger: '#ef4444',
}

export interface ReviewItem {
  id: string
  title: string
  subtitle: string
  email: string
  description: string
  hasEdits?: boolean
}

export interface ReviewSection {
  table: string
  label: string
  adminPath: string
  items: ReviewItem[]
}

export default function ReviewQueueList({ sections }: { sections: ReviewSection[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [running, setRunning] = useState(false)

  const keyOf = (table: string, id: string) => table + ':' + id

  function toggle(table: string, id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      const k = keyOf(table, id)
      if (next.has(k)) { next.delete(k) } else { next.add(k) }
      return next
    })
  }

  function toggleSection(section: ReviewSection) {
    setSelected(prev => {
      const next = new Set(prev)
      const keys = section.items.map(i => keyOf(section.table, i.id))
      const allSelected = keys.every(k => next.has(k))
      keys.forEach(k => { if (allSelected) { next.delete(k) } else { next.add(k) } })
      return next
    })
  }

  async function runBulkApprove() {
    if (selected.size === 0 || running) return
    setRunning(true)
    const items = Array.from(selected).map(k => {
      const idx = k.indexOf(':')
      return { table: k.slice(0, idx), id: k.slice(idx + 1) }
    })
    try {
      await approveMany(items)
      setSelected(new Set())
    } finally {
      setRunning(false)
      startTransition(() => router.refresh())
    }
  }

  async function runSingle(action: 'approve' | 'reject', table: string, id: string) {
    if (running) return
    setRunning(true)
    try {
      if (action === 'approve') { await approveListing(table, id) } else { await rejectListing(table, id) }
      setSelected(prev => {
        const next = new Set(prev)
        next.delete(keyOf(table, id))
        return next
      })
    } finally {
      setRunning(false)
      startTransition(() => router.refresh())
    }
  }

  const busy = running || isPending

  return (
    <div>
      {selected.size > 0 && (
        <div style={{ position: 'sticky', top: 12, zIndex: 10, marginBottom: 16, background: C.panel, border: '1px solid ' + C.green, borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>{selected.size} selected</span>
          <button
            onClick={runBulkApprove}
            disabled={busy}
            style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
          >
            {busy ? 'Approving…' : 'Approve selected'}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            disabled={busy}
            style={{ background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: busy ? 'default' : 'pointer' }}
          >
            Clear
          </button>
        </div>
      )}

      {sections.map(section =>
        section.items.length > 0 ? (
          <div key={section.table} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>
                {section.label} ({section.items.length})
              </h2>
              <button
                onClick={() => toggleSection(section)}
                disabled={busy}
                style={{ background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: busy ? 'default' : 'pointer' }}
              >
                Select all
              </button>
            </div>
            <div style={{ backgroundColor: C.panel, border: '1px solid ' + C.border, borderRadius: 12, overflow: 'hidden' }}>
              {section.items.map((item, idx) => (
                <div
                  key={item.id}
                  style={{ padding: 16, borderBottom: idx < section.items.length - 1 ? '1px solid ' + C.border : 'none', display: 'flex', gap: 14, alignItems: 'flex-start' }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', paddingTop: 2, cursor: busy ? 'default' : 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={selected.has(keyOf(section.table, item.id))}
                      onChange={() => toggle(section.table, item.id)}
                      disabled={busy}
                      style={{ width: 16, height: 16, accentColor: C.green, cursor: 'inherit' }}
                    />
                  </label>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ color: C.text, fontSize: 14, fontWeight: 600, margin: 0 }}>
                      {item.title}
                      {item.hasEdits && (
                        <span style={{ marginLeft: 8, verticalAlign: 'middle', background: 'rgba(184,138,46,0.12)', color: C.gold, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999 }}>
                          Edited — check changes
                        </span>
                      )}
                    </p>
                    <p style={{ color: C.muted, fontSize: 12, margin: '4px 0 0' }}>{item.subtitle}</p>
                    {item.email && <p style={{ color: C.muted, fontSize: 12, margin: '2px 0 0' }}>{item.email}</p>}
                    {item.description && (
                      <p style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.55, margin: '8px 0 0', borderLeft: '2px solid ' + C.border, paddingLeft: 10 }}>
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <Link
                      href={'/roodber8/' + section.adminPath + '/' + item.id}
                      style={{ background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}
                    >
                      View
                    </Link>
                    <button
                      onClick={() => runSingle('approve', section.table, item.id)}
                      disabled={busy}
                      style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => runSingle('reject', section.table, item.id)}
                      disabled={busy}
                      style={{ background: 'transparent', color: C.danger, border: '1px solid ' + C.danger, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  )
}
