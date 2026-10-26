'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { jobReportNoteAction } from '@/app/roodber8/actions/job-reports'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

/** A private staff note on one job report. */
export function JobReportNote({ reportId, note }: { reportId: string; note: string | null }) {
  const [value, setValue] = useState(note ?? '')
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input aria-label="Staff note" placeholder="Staff note" className="h-10" maxLength={1000} value={value} onChange={(e) => setValue(e.target.value)} />
      <Button
        size="sm"
        variant="ghost"
        disabled={pending || value === (note ?? '')}
        onClick={() =>
          start(async () => {
            const res = await jobReportNoteAction(reportId, value)
            toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
            if (res.ok) router.refresh()
          })
        }
      >
        Save note
      </Button>
    </div>
  )
}
