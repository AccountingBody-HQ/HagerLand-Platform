'use client'

import { useState, useTransition } from 'react'
import { Send } from 'lucide-react'
import { telegramTextAction } from '@/app/roodber8/actions/jobs'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

/** "Copy for Telegram" (Jobs Phase 5): copies the W16 text for HagerLand's channel; the text is also shown to copy by hand. */
export function CopyForTelegram({ jobId }: { jobId: string }) {
  const [pending, start] = useTransition()
  const [text, setText] = useState<string | null>(null)
  const toast = useToast()
  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await telegramTextAction(jobId)
            if (!res.ok) return toast(res.error, 'error')
            setText(res.data.text)
            const copied = await navigator.clipboard?.writeText(res.data.text).then(
              () => true,
              () => false,
            )
            toast(copied ? 'Copied. Paste it into the HagerLand Telegram channel.' : 'Copy the text below.', 'success')
          })
        }
      >
        <Send className="size-4" aria-hidden /> Copy for Telegram
      </Button>
      {text && <Textarea aria-label="Telegram text" readOnly rows={3} value={text} data-testid="telegram-text" />}
    </div>
  )
}
