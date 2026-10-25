-- Read-only check for migration 0040 (Jobs Phase 2: trades, daily labour, applying by phone, worker register, stricter
-- candidate visibility, 12-month deletion). Run it in the Supabase SQL editor right after the migration. Every row
-- should say PASS; rows marked "(count)" report numbers for your records. It changes nothing.

with cols as (
  select table_name, column_name, data_type, is_nullable from information_schema.columns
  where table_schema = 'public' and table_name in ('job_posts', 'job_applications', 'jobs_public', 'worker_register', 'job_data_cleanup_runs', 'jobs')
),
cons as (
  select c.relname as tbl, k.conname, pg_get_constraintdef(k.oid) as def from pg_constraint k join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
),
trig as (
  select c.relname as tbl, t.tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
),
grants as (
  select table_name, grantee, privilege_type from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC')
),
applied as (select applied_at from public.schema_migrations where version = '0040')
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from (
  select 1 as sort, 'jobs have an optional "trade" (job_posts.trade)' as check_name,
         exists (select 1 from cols where table_name = 'job_posts' and column_name = 'trade' and is_nullable = 'YES') as ok, '' as detail
  union all
  select 2, 'the trade must be one of the 26 approved trades (including "Other")',
         exists (select 1 from cons where tbl = 'job_posts' and conname = 'job_posts_trade_check' and def like '%aluminium-and-glass-fitter%' and def like '%gypsum-ceiling-installer%' and def like '%''other''%'
                 and (length(def) - length(replace(def, '::text', ''))) / 6 = 26),
         coalesce((select ((length(def) - length(replace(def, '::text', ''))) / 6)::text || ' trades in the list' from cons where conname = 'job_posts_trade_check'), 'missing')
  union all
  select 3, 'job types: the six existing types plus "daily_labour"',
         exists (select 1 from cons where tbl = 'job_posts' and conname = 'job_posts_employment_type_check' and def like '%daily_labour%'
                 and def like '%full_time%' and def like '%part_time%' and def like '%contract%' and def like '%temporary%' and def like '%internship%' and def like '%apprenticeship%')
           and (select count(*) from cons where tbl = 'job_posts' and def like '%employment_type%') = 1,
         (select count(*)::text || ' job type check(s)' from cons where tbl = 'job_posts' and def like '%employment_type%')
  union all
  select 4, 'the public job list (jobs_public) shows the trade',
         exists (select 1 from cols where table_name = 'jobs_public' and column_name = 'trade'), ''
  union all
  select 5, 'an application no longer needs an account or an email (for phone applications)',
         exists (select 1 from cols where table_name = 'job_applications' and column_name = 'applicant_user_id' and is_nullable = 'YES')
           and exists (select 1 from cols where table_name = 'job_applications' and column_name = 'email' and is_nullable = 'YES'), ''
  union all
  select 6, 'applications have the new columns (channel, contact method, language, trade, area, 18+ time, consent time, deleted time)',
         (select count(*) from cols where table_name = 'job_applications' and column_name in ('channel', 'preferred_contact', 'language', 'trade', 'area_text', 'adult_confirmed_at', 'consent_at', 'personal_data_deleted_at')) = 8,
         (select count(*)::text || ' of 8' from cols where table_name = 'job_applications' and column_name in ('channel', 'preferred_contact', 'language', 'trade', 'area_text', 'adult_confirmed_at', 'consent_at', 'personal_data_deleted_at'))
  union all
  select 7, 'a phone application needs a phone, the 18+ tick and the consent tick; an account application needs its account and email (until details are deleted)',
         exists (select 1 from cons where conname = 'job_applications_phone_needs_details' and def like '%adult_confirmed_at IS NOT NULL%' and def like '%consent_at IS NOT NULL%' and def like '%personal_data_deleted_at IS NOT NULL%')
           and exists (select 1 from cons where conname = 'job_applications_account_needs_details' and def like '%applicant_user_id IS NOT NULL%' and def like '%email IS NOT NULL%')
           and exists (select 1 from cons where conname = 'job_applications_phase2_values'), ''
  union all
  select 8, 'one phone application per job per phone number (unique rule)',
         exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'job_applications_phone_once_idx' and indexdef like '%UNIQUE%' and indexdef like '%(job_id, phone)%' and indexdef like '%phone%'), ''
  union all
  select 9, 'every existing application stayed an email (account) application',
         not exists (select 1 from public.job_applications a, applied p where a.created_at < p.applied_at and a.channel <> 'account'),
         (select count(*)::text || ' applications: ' || count(*) filter (where channel = 'account')::text || ' by email, ' || count(*) filter (where channel = 'phone')::text || ' by phone' from public.job_applications)
  union all
  select 10, 'no application or job row was changed by the migration (none carries its exact time)',
         not exists (select 1 from public.job_applications a, applied p where a.updated_at = p.applied_at)
           and not exists (select 1 from public.job_posts j, applied p where j.updated_at = p.applied_at), ''
  union all
  select 11, 'no personal details have been deleted yet (deletion starts on dry run)',
         not exists (select 1 from public.job_applications where personal_data_deleted_at is not null)
           and not exists (select 1 from public.job_data_cleanup_runs where mode = 'live'), ''
  union all
  select 12, 'visitors cannot read applications at all; signed-in users only through the existing rules (own applications, or an employer''s own jobs)',
         not exists (select 1 from grants where table_name = 'job_applications' and grantee in ('anon', 'PUBLIC'))
           and (select count(*) from pg_policies where schemaname = 'public' and tablename = 'job_applications') = 3
           and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'job_applications' and policyname = 'Applicants read own applications' and qual like '%applicant_user_id = auth.uid()%'),
         (select count(*)::text || ' rules on job_applications' from pg_policies where schemaname = 'public' and tablename = 'job_applications')
  union all
  select 13, 'signed-in users can change only the status and notes of applications (as before)',
         not exists (select 1 from information_schema.column_privileges where table_schema = 'public' and table_name = 'job_applications' and grantee = 'authenticated' and privilege_type = 'UPDATE' and column_name not in ('status', 'employer_notes')),
         coalesce((select string_agg(column_name, ', ') from information_schema.column_privileges where table_schema = 'public' and table_name = 'job_applications' and grantee = 'authenticated' and privilege_type = 'UPDATE'), 'none')
  union all
  select 14, 'new table worker_register exists with its columns',
         (select count(*) from cols where table_name = 'worker_register' and column_name in ('reference', 'name', 'phone', 'trades', 'area_text', 'availability', 'preferred_contact', 'language', 'adult_confirmed_at', 'consent_at', 'status', 'admin_notes', 'last_updated_at', 'personal_data_deleted_at')) = 14,
         (select count(*)::text || ' columns' from cols where table_name = 'worker_register')
  union all
  select 15, 'the worker register needs name, phone, trade, area, availability, contact method, language and both ticks (until deleted); one entry per phone',
         exists (select 1 from cons where conname = 'worker_register_needs_details' and def like '%adult_confirmed_at IS NOT NULL%' and def like '%consent_at IS NOT NULL%')
           and exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'worker_register_phone_idx' and indexdef like '%UNIQUE%'), ''
  union all
  select 16, 'new table job_data_cleanup_runs (deletion run log) exists and cannot be changed or deleted (append-only)',
         (select count(*) from cols where table_name = 'job_data_cleanup_runs' and column_name in ('mode', 'started_at', 'finished_at', 'counts', 'failures', 'run_by')) = 6
           and exists (select 1 from trig where tbl = 'job_data_cleanup_runs' and tgname = 'job_data_cleanup_runs_append_only')
           and exists (select 1 from trig where tbl = 'job_data_cleanup_runs' and tgname = 'job_data_cleanup_runs_no_truncate'), ''
  union all
  select 17, 'row level security is on for worker_register and the run log',
         (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('worker_register', 'job_data_cleanup_runs') and c.relrowsecurity) = 2, ''
  union all
  select 18, 'visitors and signed-in users have no access to worker_register or the run log (server and admin only)',
         not exists (select 1 from grants where table_name in ('worker_register', 'job_data_cleanup_runs')),
         coalesce((select string_agg(distinct table_name || ' ' || grantee || ':' || privilege_type, ', ') from grants where table_name in ('worker_register', 'job_data_cleanup_runs')), 'none')
  union all
  select 19, 'candidate profiles are shown only to verified businesses or businesses with an approved job that HagerLand has not removed',
         (select pg_get_viewdef('public.candidates_for_employers'::regclass) like '%verification_level = ''verified''%'
             and pg_get_viewdef('public.candidates_for_employers'::regclass) like '%published_at IS NOT NULL%'
             and pg_get_viewdef('public.candidates_for_employers'::regclass) like '%''removed''%'
             and pg_get_viewdef('public.candidates_for_employers'::regclass) like '%auth.uid()%'), ''
  union all
  select 20, 'candidate profiles: signed-in users can only read; visitors have no access',
         not exists (select 1 from grants where table_name = 'candidates_for_employers' and grantee in ('anon', 'PUBLIC'))
           and not exists (select 1 from grants where table_name = 'candidates_for_employers' and grantee = 'authenticated' and privilege_type <> 'SELECT')
           and exists (select 1 from grants where table_name = 'candidates_for_employers' and grantee = 'authenticated' and privilege_type = 'SELECT'), ''
  union all
  select 21, 'switches: "Apply by phone" off, worker register off, deletion on dry run',
         (select value from public.site_settings where key = 'jobs_phone_apply') = 'false'::jsonb
           and (select value from public.site_settings where key = 'jobs_worker_register') = 'false'::jsonb
           and (select value from public.site_settings where key = 'jobs_data_cleanup_mode') = '"dry_run"'::jsonb,
         coalesce((select string_agg(key || '=' || value::text, ', ' order by key) from public.site_settings where key in ('jobs_phone_apply', 'jobs_worker_register', 'jobs_data_cleanup_mode')), 'missing')
  union all
  select 22, 'the switches are never public (not in site_settings_public)',
         not exists (select 1 from public.site_settings_public where key in ('jobs_phone_apply', 'jobs_worker_register', 'jobs_data_cleanup_mode')), ''
  union all
  select 23, 'the old site''s "jobs" table is untouched (none of the new columns or rules)',
         not exists (select 1 from cols where table_name = 'jobs' and column_name in ('trade', 'channel', 'preferred_contact', 'area_text', 'adult_confirmed_at', 'consent_at', 'personal_data_deleted_at'))
           and not exists (select 1 from cons where tbl = 'jobs' and conname in ('job_posts_trade_check', 'job_posts_employment_type_check', 'job_applications_phase2_values', 'job_applications_phone_needs_details', 'job_applications_account_needs_details')),
         case when exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'jobs') then 'legacy table present' else 'no legacy table here' end
  union all
  select 24, '(count) jobs by type after the migration',
         true, coalesce((select string_agg(employment_type || ' ' || n::text, ', ' order by employment_type) from (select employment_type, count(*) as n from public.job_posts group by employment_type) x), 'no jobs')
  union all
  select 25, 'earlier tables (0034 to 0039) are still there',
         (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('supply_partners', 'supply_contacts', 'supplier_offers', 'supply_quote_lines', 'supply_agreements', 'supply_orders', 'supply_order_lines', 'supply_order_events', 'supply_delivery_proofs', 'supply_ledger_entries', 'org_field_sources', 'import_cleanup_runs')) = 12, ''
  union all
  select 26, 'migration 0040 is recorded',
         exists (select 1 from applied), coalesce((select to_char(applied_at, 'YYYY-MM-DD HH24:MI') from applied), 'not recorded')
) checks
order by sort;
