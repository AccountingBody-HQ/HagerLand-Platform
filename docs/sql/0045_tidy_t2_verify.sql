-- Read-only check for migration 0045 (Tidy T-2: the 12-month clearing of listing reports). Run it in the Supabase SQL
-- editor right after the migration. Every row should say PASS; the "detail" column shows the evidence. It changes
-- nothing. The last row is for the 3-day supply quote change: it must say PASS (0 quotes in "quoted" status) before
-- Tidy T-2 is released.

with cols as (
  select table_name, column_name, is_nullable, column_default from information_schema.columns
  where table_schema = 'public' and table_name in ('reports', 'jobs')
),
grants as (
  select grantee from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'reports' and grantee in ('anon', 'authenticated', 'PUBLIC')
),
setting(key, value) as (select key, value from public.site_settings),
applied as (select applied_at from public.schema_migrations where version = '0045')
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from (
  select 1 as sort, 'migration 0045 is recorded' as check_name, exists (select 1 from applied) as ok,
         coalesce((select to_char(applied_at, 'YYYY-MM-DD HH24:MI') from applied), 'not recorded') as detail
  union all
  select 2, 'migrations 0034 to 0044 are still recorded',
         (select count(*) from public.schema_migrations where version in ('0034', '0035', '0036', '0037', '0038', '0039', '0040', '0041', '0042', '0043', '0044')) = 11,
         (select count(*)::text || ' of 11' from public.schema_migrations where version in ('0034', '0035', '0036', '0037', '0038', '0039', '0040', '0041', '0042', '0043', '0044'))
  union all
  select 3, 'listing reports have the two new columns, both optional with no default',
         (select count(*) from cols where table_name = 'reports' and column_name in ('handled_at', 'personal_data_deleted_at') and is_nullable = 'YES' and column_default is null) = 2,
         coalesce((select string_agg(column_name || ' nullable=' || is_nullable || ' default=' || coalesce(column_default, 'none'), ', ' order by column_name) from cols where table_name = 'reports' and column_name in ('handled_at', 'personal_data_deleted_at')), 'missing')
  union all
  select 4, 'no existing listing report was changed (both new columns empty on every row)',
         not exists (select 1 from public.reports where handled_at is not null or personal_data_deleted_at is not null),
         (select count(*)::text || ' reports, ' || count(*) filter (where handled_at is not null or personal_data_deleted_at is not null)::text || ' with a value' from public.reports)
  union all
  select 5, 'the clearing index exists',
         exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'reports' and indexname = 'reports_cleanup_idx' and indexdef like '%personal_data_deleted_at IS NULL%'),
         coalesce((select indexdef from pg_indexes where schemaname = 'public' and indexname = 'reports_cleanup_idx'), 'missing')
  union all
  select 6, 'row level security is still on for listing reports, with no access for visitors or signed-in users',
         exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'reports' and c.relrowsecurity)
           and not exists (select 1 from grants),
         coalesce((select string_agg(distinct grantee, ', ') from grants), 'no grants')
  union all
  select 7, 'listing reports keep all their original columns',
         (select count(*) from cols where table_name = 'reports' and column_name in ('id', 'entity_type', 'entity_id', 'reason', 'details', 'reporter_contact', 'status', 'ip_hash', 'created_at', 'updated_at')) = 10,
         (select count(*)::text || ' of 10' from cols where table_name = 'reports' and column_name in ('id', 'entity_type', 'entity_id', 'reason', 'details', 'reporter_contact', 'status', 'ip_hash', 'created_at', 'updated_at'))
  union all
  select 8, 'every switch unchanged: phone apply, register, desk, private-client, badge clean-up, Amharic for Jobs, call-backs, site-wide Amharic Off; reports On; Jobs deletion and Imports clean-up Dry run; keeping period empty',
         (select value from setting where key = 'jobs_phone_apply') = 'false'::jsonb
           and (select value from setting where key = 'jobs_worker_register') = 'false'::jsonb
           and (select value from setting where key = 'jobs_recruitment_desk') = 'false'::jsonb
           and (select value from setting where key = 'jobs_private_client_posts') = 'false'::jsonb
           and (select value from setting where key = 'org_verification_expiry') = 'false'::jsonb
           and (select value from setting where key = 'jobs_amharic') = 'false'::jsonb
           and (select value from setting where key = 'jobs_callbacks') = 'false'::jsonb
           and (select value from setting where key = 'amharic_enabled') = 'false'::jsonb
           and (select value from setting where key = 'jobs_reports_enabled') = 'true'::jsonb
           and (select value from setting where key = 'jobs_data_cleanup_mode') = '"dry_run"'::jsonb
           and (select value from setting where key = 'imports_cleanup_mode') = '"dry_run"'::jsonb
           and (select value from setting where key = 'jobs_fee_record_retention_months') = 'null'::jsonb,
         coalesce((select string_agg(key || '=' || value::text, ', ' order by key) from setting where key in ('jobs_phone_apply', 'jobs_worker_register', 'jobs_recruitment_desk', 'jobs_private_client_posts', 'org_verification_expiry', 'jobs_amharic', 'jobs_callbacks', 'amharic_enabled', 'jobs_reports_enabled', 'jobs_data_cleanup_mode', 'imports_cleanup_mode', 'jobs_fee_record_retention_months')), 'missing')
  union all
  select 9, 'the old site''s "jobs" table is untouched',
         not exists (select 1 from cols where table_name = 'jobs' and column_name in ('handled_at', 'personal_data_deleted_at')),
         case when exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'jobs') then 'legacy table present' else 'no legacy table here' end
  union all
  select 10, 'supply quotes currently in quoted status (must be 0 for the 3-day change)',
         (select count(*) from public.quote_requests where status = 'quoted') = 0,
         (select count(*)::text from public.quote_requests where status = 'quoted')
) checks
order by sort;
