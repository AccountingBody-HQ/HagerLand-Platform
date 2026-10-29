-- Read-only check for migration 0047 (F-5 keeping periods). Run it in the Supabase SQL editor right after the
-- migration. Every row should say PASS; the "detail" column shows the evidence. It changes nothing. The last row only
-- shows the record counts of the ten tables (information: always PASS).

with t(name) as (
  values ('enquiries'), ('service_requests'), ('quote_requests'), ('property_care_requests'), ('managed_properties'),
         ('build_projects'), ('partner_applications'), ('claims'), ('trade_accounts')
),
cols as (
  select c.table_name, c.column_name, c.is_nullable, c.column_default, c.data_type from information_schema.columns c
  where c.table_schema = 'public' and c.column_name in ('personal_data_deleted_at', 'ended_at')
),
filled as (
  select 'enquiries' as name, count(*) filter (where personal_data_deleted_at is not null) as n from public.enquiries
  union all select 'service_requests', count(*) filter (where personal_data_deleted_at is not null) from public.service_requests
  union all select 'quote_requests', count(*) filter (where personal_data_deleted_at is not null) from public.quote_requests
  union all select 'property_care_requests', count(*) filter (where personal_data_deleted_at is not null) from public.property_care_requests
  union all select 'managed_properties', count(*) filter (where personal_data_deleted_at is not null) from public.managed_properties
  union all select 'build_projects', count(*) filter (where personal_data_deleted_at is not null) from public.build_projects
  union all select 'partner_applications', count(*) filter (where personal_data_deleted_at is not null) from public.partner_applications
  union all select 'claims', count(*) filter (where personal_data_deleted_at is not null) from public.claims
  union all select 'trade_accounts', count(*) filter (where personal_data_deleted_at is not null) from public.trade_accounts
),
counts as (
  select 'enquiries' as name, count(*) as n from public.enquiries
  union all select 'service_requests', count(*) from public.service_requests
  union all select 'quote_requests', count(*) from public.quote_requests
  union all select 'property_care_requests', count(*) from public.property_care_requests
  union all select 'managed_properties', count(*) from public.managed_properties
  union all select 'build_projects', count(*) from public.build_projects
  union all select 'partner_applications', count(*) from public.partner_applications
  union all select 'claims', count(*) from public.claims
  union all select 'trade_accounts', count(*) from public.trade_accounts
  union all select 'supply_contacts', count(*) from public.supply_contacts
),
idx(name) as (
  values ('enquiries_retention_idx'), ('service_requests_retention_idx'), ('quote_requests_retention_idx'),
         ('property_care_requests_retention_idx'), ('managed_properties_retention_idx'), ('build_projects_retention_idx'),
         ('partner_applications_retention_idx'), ('claims_retention_idx'), ('trade_accounts_retention_idx'),
         ('errors_last_seen_idx'), ('supply_contacts_retention_idx')
),
ten(name) as (select name from t union all select 'supply_contacts'),
grants as (
  select table_name, grantee, privilege_type from information_schema.role_table_grants
  where table_schema = 'public' and table_name in (select name from ten) and grantee in ('anon', 'PUBLIC')
),
colgrants as (
  select table_name, column_name, grantee, privilege_type from information_schema.column_privileges
  where table_schema = 'public' and table_name in (select name from ten) and grantee in ('anon', 'authenticated', 'PUBLIC')
    and column_name in ('personal_data_deleted_at', 'ended_at')
),
setting(key, value) as (select key, value from public.site_settings),
applied as (select applied_at from public.schema_migrations where version = '0047')
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from (
  select 1 as sort, 'migration 0047 is recorded' as check_name, exists (select 1 from applied) as ok,
         coalesce((select to_char(applied_at, 'YYYY-MM-DD HH24:MI') from applied), 'not recorded') as detail
  union all
  select 2, 'migrations 0034 to 0046 are still recorded',
         (select count(*) from public.schema_migrations where version in ('0034', '0035', '0036', '0037', '0038', '0039', '0040', '0041', '0042', '0043', '0044', '0045', '0046')) = 13,
         (select count(*)::text || ' of 13' from public.schema_migrations where version in ('0034', '0035', '0036', '0037', '0038', '0039', '0040', '0041', '0042', '0043', '0044', '0045', '0046'))
  union all
  select 3, 'the nine "personal details deleted" columns exist: date and time, optional, no default',
         (select count(*) from cols where column_name = 'personal_data_deleted_at' and table_name in (select name from t) and is_nullable = 'YES' and column_default is null and data_type = 'timestamp with time zone') = 9,
         (select count(*)::text || ' of 9' from cols where column_name = 'personal_data_deleted_at' and table_name in (select name from t) and is_nullable = 'YES' and column_default is null)
  union all
  select 4, 'no record has been cleared (every new column is empty)',
         not exists (select 1 from filled where n > 0),
         (select string_agg(name || '=' || n, ', ' order by name) from filled)
  union all
  select 5, 'managed properties have the "ended at" column (optional, no default)',
         exists (select 1 from cols where table_name = 'managed_properties' and column_name = 'ended_at' and is_nullable = 'YES' and column_default is null),
         coalesce((select 'nullable=' || is_nullable || ', default=' || coalesce(column_default, 'none') from cols where table_name = 'managed_properties' and column_name = 'ended_at'), 'missing')
  union all
  select 6, 'the "management ended" trigger exists on managed properties',
         exists (select 1 from pg_trigger where tgname = 'managed_properties_set_ended_at' and tgrelid = 'public.managed_properties'::regclass and not tgisinternal),
         coalesce((select pg_get_triggerdef(oid) from pg_trigger where tgname = 'managed_properties_set_ended_at' and tgrelid = 'public.managed_properties'::regclass), 'missing')
  union all
  select 7, 'the clean-up indexes exist',
         (select count(*) from pg_indexes where schemaname = 'public' and indexname in (select name from idx)) = 11,
         (select count(*)::text || ' of 11' from pg_indexes where schemaname = 'public' and indexname in (select name from idx))
  union all
  select 8, 'ended managed properties without an end date (expected 0)',
         (select count(*) from public.managed_properties where status = 'ended' and ended_at is null) = 0,
         (select count(*)::text || ' ended without ended_at; ' from public.managed_properties where status = 'ended' and ended_at is null)
           || (select count(*)::text || ' managed properties in total' from public.managed_properties)
  union all
  select 9, 'row level security is still on for the ten tables',
         (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in (select name from ten) and c.relrowsecurity) = 10,
         (select count(*)::text || ' of 10' from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in (select name from ten) and c.relrowsecurity)
  union all
  select 10, 'no grant added: visitors have no access; signed-in users keep only their existing read of their own trade account (the new column comes with it)',
         not exists (select 1 from grants)
           and (select coalesce(string_agg(table_name || ':' || privilege_type, ',' order by table_name, privilege_type), '') from information_schema.role_table_grants
                where table_schema = 'public' and table_name in (select name from ten) and grantee = 'authenticated') = 'trade_accounts:SELECT'
           and (select coalesce(string_agg(table_name || '.' || column_name || ':' || privilege_type, ',' order by table_name), '') from information_schema.column_privileges
                where table_schema = 'public' and table_name in (select name from ten) and grantee in ('anon', 'authenticated', 'PUBLIC') and column_name in ('personal_data_deleted_at', 'ended_at')) = 'trade_accounts.personal_data_deleted_at:SELECT',
         'visitor table grants: ' || (select count(*)::text from grants) || '; signed-in table grants: '
           || coalesce((select string_agg(table_name || ':' || privilege_type, ', ') from information_schema.role_table_grants where table_schema = 'public' and table_name in (select name from ten) and grantee = 'authenticated'), 'none')
           || '; new-column access: ' || coalesce((select string_agg(table_name || '.' || column_name || ' ' || privilege_type || ' (' || grantee || ')', ', ') from colgrants), 'none')
  union all
  select 11, 'every switch unchanged: deletion and Imports clean-up on Dry run; phone apply, register, desk, private-client, badge clean-up, Amharic for Jobs, call-backs, site-wide Amharic Off; reports On',
         (select value from setting where key = 'jobs_data_cleanup_mode') = '"dry_run"'::jsonb
           and (select value from setting where key = 'imports_cleanup_mode') = '"dry_run"'::jsonb
           and (select value from setting where key = 'jobs_phone_apply') = 'false'::jsonb
           and (select value from setting where key = 'jobs_worker_register') = 'false'::jsonb
           and (select value from setting where key = 'jobs_recruitment_desk') = 'false'::jsonb
           and (select value from setting where key = 'jobs_private_client_posts') = 'false'::jsonb
           and (select value from setting where key = 'org_verification_expiry') = 'false'::jsonb
           and (select value from setting where key = 'jobs_amharic') = 'false'::jsonb
           and (select value from setting where key = 'jobs_callbacks') = 'false'::jsonb
           and (select value from setting where key = 'amharic_enabled') = 'false'::jsonb
           and (select value from setting where key = 'jobs_reports_enabled') = 'true'::jsonb,
         coalesce((select string_agg(key || '=' || value::text, ', ' order by key) from setting where key in ('jobs_data_cleanup_mode', 'imports_cleanup_mode', 'jobs_phone_apply', 'jobs_worker_register', 'jobs_recruitment_desk', 'jobs_private_client_posts', 'org_verification_expiry', 'jobs_amharic', 'jobs_callbacks', 'amharic_enabled', 'jobs_reports_enabled')), 'missing')
  union all
  select 12, 'the old site''s "jobs" table is untouched (no new column, no policy)',
         not exists (select 1 from cols where table_name = 'jobs')
           and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'jobs'),
         case when exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'jobs')
           then 'legacy table present: ' || (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.jobs', false, true, '')))[1]::text || ' rows, '
             || (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'jobs') || ' policies'
           else 'no legacy table here' end
  union all
  select 13, 'record counts of the ten tables (information)', true,
         (select string_agg(name || '=' || n, ', ' order by name) from counts)
) checks
order by sort;
