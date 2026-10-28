-- 0044 · Jobs Phase 6: the status history of every job (review reports/J6-0, decision C2-1), for honest "sent back",
-- "removed", "expired" counts and the time from first submission to first approval on the Jobs insights.
--   - job_status_events: one row each time a job's status is set (on creation) or changes. Job id, from and to status,
--     who changed it (actor_kind) and when. No names, no text, no personal data. Server only. Append-only: nobody can
--     change or delete a row directly; a job's history goes only with the job itself (jobs are never deleted by the
--     website; the database test script deletes its own test job).
--   - actor_kind is never guessed (AB's fix 3):
--       employer  the change came from a signed-in user (the database role is anon or authenticated);
--       staff     the change came from the server with the service role AND the request said "staff"
--                 (header x-hl-job-actor, sent only by admin actions after their staff check);
--       system    the same, with "system" (sent only by the daily job);
--       server    any other change (the service role without that header, SQL run by hand, a migration).
--     A signed-in user cannot claim "staff" or "system": their role is checked first.
--   - The trigger runs after the job's own triggers and next to them (none is replaced). If writing the history fails,
--     the status change fails too, so there are no silent gaps.
-- Additive: one new table, one new function, three new triggers, two indexes. No existing table, view, trigger, policy
-- or row is changed; no legacy table (including the old site's "jobs") is touched. Safe to run again.
begin;

create table if not exists public.job_status_events (
  id uuid primary key default gen_random_uuid(),
  job_post_id uuid not null references public.job_posts (id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_kind text not null check (actor_kind in ('employer', 'staff', 'system', 'server')),
  created_at timestamptz not null default now()
);
create index if not exists job_status_events_job_idx on public.job_status_events (job_post_id, created_at);
create index if not exists job_status_events_status_idx on public.job_status_events (to_status, created_at);

-- Append-only (the same function as the supply ledger and the fee record). A direct delete is refused; the only delete
-- allowed is the one the database itself makes when the job row is deleted (the foreign key cascade runs inside a
-- trigger, so pg_trigger_depth() is above 0 there).
create or replace trigger job_status_events_append_only before update on public.job_status_events
  for each row execute function public.supply_append_only();
create or replace trigger job_status_events_no_delete before delete on public.job_status_events
  for each row when (pg_trigger_depth() = 0) execute function public.supply_append_only();
create or replace trigger job_status_events_no_truncate before truncate on public.job_status_events
  for each statement execute function public.supply_append_only();

create or replace function public.job_posts_status_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(current_setting('role', true), 'none');
  v_said text;
  v_actor text;
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return null;
  end if;
  if v_role in ('anon', 'authenticated') then
    v_actor := 'employer';
  elsif v_role = 'service_role' then
    begin
      v_said := (nullif(current_setting('request.headers', true), '')::json) ->> 'x-hl-job-actor';
    exception when others then
      v_said := null;
    end;
    v_actor := case when v_said in ('staff', 'system') then v_said else 'server' end;
  else
    v_actor := 'server';
  end if;
  insert into public.job_status_events (job_post_id, from_status, to_status, actor_kind)
  values (new.id, case when tg_op = 'UPDATE' then old.status::text end, new.status::text, v_actor);
  return null;
end
$$;
create or replace trigger job_posts_status_history after insert or update of status on public.job_posts
  for each row execute function public.job_posts_status_history();

-- Server only: no anon or signed-in access at all.
alter table public.job_status_events enable row level security;
revoke all on table public.job_status_events from public, anon, authenticated;
revoke all on function public.job_posts_status_history() from public, anon, authenticated;

insert into public.schema_migrations (version, name) values ('0044', 'jobs_phase_6') on conflict (version) do nothing;

commit;
