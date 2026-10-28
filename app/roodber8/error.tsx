'use client'

import { useEffect } from 'react'
import { ErrorPanel } from '@/components/layout/ErrorPanel'
import { Button } from '@/components/ui/Button'

// Fix F-2 (A-01): a failed admin page (the failure rule: a database read that failed) keeps the admin header and menu.
// The same texts as the site's error page; "Contact us" is left out because the admin is HagerLand itself.
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <ErrorPanel
      code="Something went wrong"
      title="This page didn't load properly"
      message="It's on our side, not yours. Please try again. If it keeps happening, contact us and we'll fix it."
      actions={<Button onClick={reset}>Try again</Button>}
    />
  )
}
