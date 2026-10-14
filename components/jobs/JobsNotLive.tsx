import { Briefcase } from 'lucide-react'
import { EmptyState } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'

/** Shown in account job pages while the jobs vertical is not live (spec 24.2). */
export function JobsNotLive() {
  return (
    <EmptyState
      icon={<Briefcase />}
      title="Jobs on HagerLand open soon"
      description="We are getting the job board ready. Register your interest and we will email you when you can post jobs and apply."
      actions={<ButtonLink href="/jobs#register">Register your interest</ButtonLink>}
    />
  )
}
