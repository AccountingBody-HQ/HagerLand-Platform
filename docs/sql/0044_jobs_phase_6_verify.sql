-- Read-only check for migration 0044 (Jobs Phase 6: the status history of every job, for the Jobs insights). Run it in
-- the Supabase SQL editor right after the migration. Every row should say PASS; the "detail" column shows the evidence.
-- It changes nothing.
-- Row 20 (history rows = jobs) is only meaningful right after the migration: from then on every job gets a history row
-- each time its status changes, so later there are more history rows than jobs.

with cols as (
  select table_name, column_name, ordinal_position from information_schema.columns
  where table_schema = 'public' and table_name in ('job_status_events', 'jobs_public', 'site_settings_public', 'jobs')
),
cons as (
  select k.conname, pg_get_constraintdef(k.oid) as def from pg_constraint k join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'job_status_events'
),
trg as (
  select c.relname as tbl, t.tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal and c.relname in ('job_status_events', 'job_posts', 'jobs')
),
fn as (
  select p.oid, p.prosecdef, p.proconfig, p.proacl from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'job_posts_status_history'
),
grants as (
  select table_name, grantee from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'job_status_events' and grantee in ('anon', 'authenticated', 'PUBLIC')
),
-- The public settings list after 0043.
public_keys(key) as (
  values ('contact_details'), ('social_links'), ('announcement_bar'), ('homepage_featured_ids'), ('listing_expiry_days'), ('min_results_for_index'),
         ('private_owner_max_active_listings'), ('verified_business_count_min'), ('quote_response_target'), ('legal_last_updated'), ('legal_entity'),
         ('free_listing_confirmed'), ('developments_claims'), ('delivery_area'), ('property_care_pricing'), ('amharic_enabled'), ('licences'),
         ('agency_fee_schedule'), ('rent_ready_checklist'), ('jobs_amharic')
),
setting(key, value) as (select key, value from public.site_settings),
applied as (select applied_at from public.schema_migrations where version = '0044')
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from (
  select 1 as sort, 'migration 0044 is recorded' as check_name, exists (select 1 from applied) as ok,
         coalesce((select to_char(applied_at, 'YYYY-MM-DD HH24:MI') from applied), 'not recorded') as detail
  union all
  select 2, 'migrations 0034 to 0043 are still recorded',
         (select count(*) from public.schema_migrations where version in ('0034', '0035', '0036', '0037', '0038', '0039', '0040', '0041', '0042', '0043')) = 10,
         (select count(*)::text || ' of 10' from public.schema_migrations where version in ('0034', '0035', '0036', '0037', '0038', '0039', '0040', '0041', '0042', '0043'))
  union all
  select 3, 'the job status history table exists with its six columns (no names, no text)',
         (select count(*) from cols where table_name = 'job_status_events') = 6
           and (select count(*) from cols where table_name = 'job_status_events' and column_name in ('id', 'job_post_id', 'from_status', 'to_status', 'actor_kind', 'created_at')) = 6,
         coalesce((select string_agg(column_name, ', ' order by ordinal_position) from cols where table_name = 'job_status_events'), 'missing')
  union all
  select 4, 'row level security is on for the history table',
         exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'job_status_events' and c.relrowsecurity), ''
  union all
  select 5, 'the history table has no access rules (policies)',
         not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'job_status_events'),
         (select count(*)::text || ' policies' from pg_policies where schemaname = 'public' and tablename = 'job_status_events')
  union all
  select 6, 'visitors and signed-in users have no access to the history table (no grants)',
         not exists (select 1 from grants),
         coalesce((select string_agg(distinct grantee, ', ') from grants), 'none')
  union all
  select 7, 'the history cannot be changed, deleted directly or emptied (append-only triggers)',
         (select count(*) from trg where tbl = 'job_status_events' and tgname in ('job_status_events_append_only', 'job_status_events_no_delete', 'job_status_events_no_truncate')) = 3,
         coalesce((select string_agg(tgname, ', ' order by tgname) from trg where tbl = 'job_status_events'), 'none')
  union all
  select 8, 'who changed a status is one of: employer, staff, system, server',
         exists (select 1 from cons where def like '%actor_kind%' and def like '%employer%' and def like '%staff%' and def like '%system%' and def like '%server%'),
         coalesce((select def from cons where def like '%actor_kind%'), 'missing')
  union all
  select 9, 'each history row belongs to a job (foreign key to job_posts)',
         exists (select 1 from cons where def like 'FOREIGN KEY (job_post_id) REFERENCES job_posts(id)%'),
         coalesce((select def from cons where def like 'FOREIGN KEY%'), 'missing')
  union all
  select 10, 'the status history trigger is on job_posts',
         exists (select 1 from trg where tbl = 'job_posts' and tgname = 'job_posts_status_history'), ''
  union all
  select 11, 'the history function runs with its owner''s rights and an empty search path',
         exists (select 1 from fn where prosecdef and proconfig @> array['search_path=""']),
         coalesce((select 'security definer=' || prosecdef::text || ', ' || array_to_string(proconfig, ',') from fn), 'missing')
  union all
  select 12, 'visitors and signed-in users cannot call the history function',
         exists (select 1 from fn) and not has_function_privilege('anon', (select oid from fn), 'execute') and not has_function_privilege('authenticated', (select oid from fn), 'execute')
           and not exists (select 1 from fn, aclexplode(coalesce(proacl, '{}')) a where a.grantee = 0),
         coalesce((select array_to_string(proacl, ', ') from fn), 'default')
  union all
  select 13, 'both history indexes exist',
         (select count(*) from pg_indexes where schemaname = 'public' and tablename = 'job_status_events' and indexname in ('job_status_events_job_idx', 'job_status_events_status_idx')) = 2,
         (select string_agg(indexname, ', ' order by indexname) from pg_indexes where schemaname = 'public' and tablename = 'job_status_events')
  union all
  select 14, 'the earlier job_posts triggers are all still there',
         (select count(*) from trg where tbl = 'job_posts' and tgname in ('job_posts_private_client_guard', 'jobs_before_write', 'protect_privileged_columns', 'set_updated_at')) = 4,
         (select string_agg(tgname, ', ' order by tgname) from trg where tbl = 'job_posts')
  union all
  select 15, 'the public jobs view still has its 27 columns, ending with trade and posted_for',
         (select count(*) from cols where table_name = 'jobs_public') = 27
           and exists (select 1 from cols where table_name = 'jobs_public' and column_name = 'trade' and ordinal_position = 26)
           and exists (select 1 from cols where table_name = 'jobs_public' and column_name = 'posted_for' and ordinal_position = 27),
         (select count(*)::text || ' columns' from cols where table_name = 'jobs_public')
  union all
  select 16, 'the public settings list is unchanged (key, value; jobs_amharic public, jobs_callbacks not)',
         (select count(*) from cols where table_name = 'site_settings_public') = 2
           and not exists (select 1 from public.site_settings_public where key not in (select key from public_keys))
           and exists (select 1 from public.site_settings_public where key = 'jobs_amharic')
           and not exists (select 1 from public.site_settings_public where key = 'jobs_callbacks'),
         (select string_agg(column_name, ', ' order by ordinal_position) from cols where table_name = 'site_settings_public')
  union all
  select 17, 'every Jobs switch unchanged: phone apply, register, desk, private-client, badge clean-up, Amharic for Jobs, call-backs Off; reports On; deletion Dry run; keeping period empty; site-wide Amharic Off',
         (select value from setting where key = 'jobs_phone_apply') = 'false'::jsonb
           and (select value from setting where key = 'jobs_worker_register') = 'false'::jsonb
           and (select value from setting where key = 'jobs_recruitment_desk') = 'false'::jsonb
           and (select value from setting where key = 'jobs_private_client_posts') = 'false'::jsonb
           and (select value from setting where key = 'org_verification_expiry') = 'false'::jsonb
           and (select value from setting where key = 'jobs_amharic') = 'false'::jsonb
           and (select value from setting where key = 'jobs_callbacks') = 'false'::jsonb
           and (select value from setting where key = 'jobs_reports_enabled') = 'true'::jsonb
           and (select value from setting where key = 'jobs_data_cleanup_mode') = '"dry_run"'::jsonb
           and (select value from setting where key = 'jobs_fee_record_retention_months') = 'null'::jsonb
           and (select value from setting where key = 'amharic_enabled') = 'false'::jsonb,
         coalesce((select string_agg(key || '=' || value::text, ', ' order by key) from setting where key in ('jobs_phone_apply', 'jobs_worker_register', 'jobs_recruitment_desk', 'jobs_private_client_posts', 'org_verification_expiry', 'jobs_amharic', 'jobs_callbacks', 'jobs_reports_enabled', 'jobs_data_cleanup_mode', 'jobs_fee_record_retention_months', 'amharic_enabled')), 'missing')
  union all
  select 18, 'the old site''s "jobs" table is untouched (no history column or trigger)',
         not exists (select 1 from cols where table_name = 'jobs' and column_name in ('job_post_id', 'from_status', 'to_status', 'actor_kind'))
           and not exists (select 1 from trg where tbl = 'jobs' and tgname = 'job_posts_status_history'),
         case when exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'jobs') then 'legacy table present' else 'no legacy table here' end
  union all
  select 19, 'no existing job changed status because of the migration (no job was updated)',
         not exists (select 1 from public.job_status_events where from_status is not null and created_at <= coalesce((select applied_at from applied), now())), ''
  union all
  select 20, 'history rows equal jobs (live right after the migration: 0 = 0)',
         (select count(*) from public.job_status_events) = (select count(*) from public.job_posts),
         (select 'history ' || count(*) from public.job_status_events) || ', jobs ' || (select count(*) from public.job_posts)
) checks
order by sort;
