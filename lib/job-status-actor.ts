// Jobs Phase 6 (0044): the job status history records who changed a job's status. A signed-in user's change is always
// "employer" (the database checks the role). A change made with the service role is "staff" or "system" only when the
// request says so with this header; otherwise the database records "server". Only admin actions (after their staff
// check) send "staff", and only the daily job sends "system".

export const JOB_ACTOR_HEADER = 'x-hl-job-actor'
export type JobActor = 'staff' | 'system'

/** Marks a service-role query on job_posts with who is changing the status. */
export function asJobActor<T extends { setHeader(name: string, value: string): unknown }>(query: T, actor: JobActor): T {
  return query.setHeader(JOB_ACTOR_HEADER, actor) as T
}
