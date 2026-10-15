'use client'

import { useEffect } from 'react'
import { ErrorPanel } from '@/components/layout/ErrorPanel'
import { Button, ButtonLink } from '@/components/ui/Button'

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <ErrorPanel
      code="Something went wrong"
      title="This page didn't load properly"
      message="It's on our side, not yours. Please try again. If it keeps happening, contact us and we'll fix it."
      actions={
        <>
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/contact" variant="secondary">
            Contact us
          </ButtonLink>
        </>
      }
    />
  )
}
