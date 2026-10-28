-- Read-only check for migration 0043 (Jobs Phase 5: call-back requests, the wrong-number block list, and the switches
-- for Amharic for Jobs and call-backs). Run it in the Supabase SQL editor right after the migration. Every row should
-- say PASS; rows marked "(count)" report numbers for your records. It changes nothing.

with new_tables(name) as (values ('callback_requests'), ('callback_blocked_phones')),
cols as (
  select table_name, column_name, ordinal_position from information_schema.columns
  where table_schema = 'public' and table_name in ('callback_requests', 'callback_blocked_phones', 'site_settings_public', 'jobs')
),
cons as (
  select c.relname as tbl, k.conname, pg_get_constraintdef(k.oid) as def from pg_constraint k join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
),
grants as (
  select table_name, grantee from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC')
),
-- The public settings list as it was after 0028, plus jobs_amharic (0043).
public_keys(key) as (
  values ('contact_details'), ('social_links'), ('announcement_bar'), ('homepage_featured_ids'), ('listing_expiry_days'), ('min_results_for_index'),
         ('private_owner_max_active_listings'), ('verified_business_count_min'), ('quote_response_target'), ('legal_last_updated'), ('legal_entity'),
         ('free_listing_confirmed'), ('developments_claims'), ('delivery_area'), ('property_care_pricing'), ('amharic_enabled'), ('licences'),
         ('agency_fee_schedule'), ('rent_ready_checklist'), ('jobs_amharic')
),
setting(key, value) as (select key, value from public.site_settings),
applied as (select applied_at from public.schema_migrations where version = '0043')
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from (
  select 1 as sort, 'migration 0043 is recorded' as check_name, exists (select 1 from applied) as ok,
         coalesce((select to_char(applied_at, 'YYYY-MM-DD HH24:MI') from applied), 'not recorded') as detail
  union all
  select 2, 'migrations 0034 to 0042 are still recorded',
         (select count(*) from public.schema_migrations where version in ('0034', '0035', '0036', '0037', '0038', '0039', '0040', '0041', '0042')) = 9,
         (select count(*)::text || ' of 9' from public.schema_migrations where version in ('0034', '0035', '0036', '0037', '0038', '0039', '0040', '0041', '0042'))
  union all
  select 3, 'the two new tables exist (call-back requests, wrong-number block list)',
         (select count(*) from information_schema.tables where table_schema = 'public' and table_name in (select name from new_tables)) = 2,
         (select count(*)::text || ' of 2' from information_schema.tables where table_schema = 'public' and table_name in (select name from new_tables))
  union all
  select 4, 'row level security is on for both new tables',
         (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in (select name from new_tables) and c.relrowsecurity) = 2, ''
  union all
  select 5, 'visitors and signed-in users have no access to the new tables (no grants)',
         not exists (select 1 from grants where table_name in (select name from new_tables)),
         coalesce((select string_agg(distinct table_name || ':' || grantee, ', ') from grants where table_name in (select name from new_tables)), 'none')
  union all
  select 6, 'one open call-back request per phone number (unique index)',
         exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'callback_requests' and indexname = 'callback_requests_open_per_phone' and indexdef like 'CREATE UNIQUE INDEX%' and indexdef like '%(phone)%' and indexdef like '%open%'),
         coalesce((select indexdef from pg_indexes where schemaname = 'public' and indexname = 'callback_requests_open_per_phone'), 'missing')
  union all
  select 7, 'call-back requests hold the details, consent, outcome, tries, handling, link and deletion date',
         (select count(*) from cols where table_name = 'callback_requests' and column_name in ('reference', 'name', 'phone', 'need', 'area_text', 'language', 'time_of_day', 'based_abroad', 'country_code', 'consent_at', 'ip_hash', 'status', 'outcome', 'tries', 'service_request_id', 'handled_by', 'handled_at', 'staff_note', 'personal_data_deleted_at', 'created_at')) = 20
           and exists (select 1 from cons where tbl = 'callback_requests' and conname = 'callback_requests_needs_details')
           and exists (select 1 from cons where tbl = 'callback_requests' and conname = 'callback_requests_closed')
           and exists (select 1 from cons where tbl = 'callback_requests' and conname = 'callback_requests_abroad'), ''
  union all
  select 8, 'the block list holds only a coded phone number and the end date',
         (select count(*) from cols where table_name = 'callback_blocked_phones') = 3
           and (select count(*) from cols where table_name = 'callback_blocked_phones' and column_name in ('phone_hash', 'blocked_until', 'created_at')) = 3, ''
  union all
  select 9, 'new switches: Amharic for Jobs Off, call-back requests Off',
         (select value from setting where key = 'jobs_amharic') = 'false'::jsonb and (select value from setting where key = 'jobs_callbacks') = 'false'::jsonb,
         coalesce((select string_agg(key || '=' || value::text, ', ' order by key) from setting where key in ('jobs_amharic', 'jobs_callbacks')), 'missing')
  union all
  select 10, 'jobs_amharic is in the public settings list (value false); jobs_callbacks is not',
         (select value from public.site_settings_public where key = 'jobs_amharic') = 'false'::jsonb and not exists (select 1 from public.site_settings_public where key = 'jobs_callbacks'),
         coalesce((select 'public jobs_amharic=' || value::text from public.site_settings_public where key = 'jobs_amharic'), 'jobs_amharic not public')
  union all
  select 11, 'the public settings list has the same two columns (key, value)',
         (select count(*) from cols where table_name = 'site_settings_public') = 2
           and exists (select 1 from cols where table_name = 'site_settings_public' and column_name = 'key' and ordinal_position = 1)
           and exists (select 1 from cols where table_name = 'site_settings_public' and column_name = 'value' and ordinal_position = 2),
         (select string_agg(column_name, ', ' order by ordinal_position) from cols where table_name = 'site_settings_public')
  union all
  select 12, 'the public settings list shows nothing beyond the earlier keys plus jobs_amharic',
         not exists (select 1 from public.site_settings_public where key not in (select key from public_keys)),
         coalesce((select string_agg(key, ', ') from public.site_settings_public where key not in (select key from public_keys)), 'none extra')
  union all
  -- 0043 never writes amharic_enabled: this row shows its value so you can compare it with what it was before.
  select 13, 'the site-wide Amharic setting is still there and still public (0043 does not change it; value shown)',
         exists (select 1 from setting where key = 'amharic_enabled') and exists (select 1 from public.site_settings_public where key = 'amharic_enabled'),
         coalesce((select 'amharic_enabled=' || value::text from setting where key = 'amharic_enabled'), 'missing')
  union all
  select 14, 'earlier Jobs switches unchanged (Phase 2-4 values): phone apply, register, desk, private-client, badge clean-up Off; reports On; deletion Dry run; keeping period empty',
         (select value from setting where key = 'jobs_phone_apply') = 'false'::jsonb
           and (select value from setting where key = 'jobs_worker_register') = 'false'::jsonb
           and (select value from setting where key = 'jobs_recruitment_desk') = 'false'::jsonb
           and (select value from setting where key = 'jobs_private_client_posts') = 'false'::jsonb
           and (select value from setting where key = 'org_verification_expiry') = 'false'::jsonb
           and (select value from setting where key = 'jobs_reports_enabled') = 'true'::jsonb
           and (select value from setting where key = 'jobs_data_cleanup_mode') = '"dry_run"'::jsonb
           and (select value from setting where key = 'jobs_fee_record_retention_months') = 'null'::jsonb,
         coalesce((select string_agg(key || '=' || value::text, ', ' order by key) from setting where key in ('jobs_phone_apply', 'jobs_worker_register', 'jobs_recruitment_desk', 'jobs_private_client_posts', 'org_verification_expiry', 'jobs_reports_enabled', 'jobs_data_cleanup_mode', 'jobs_fee_record_retention_months')), 'missing')
  union all
  select 15, 'the old site''s "jobs" table is untouched',
         not exists (select 1 from cols where table_name = 'jobs' and column_name in ('callback_id', 'phone_hash', 'blocked_until', 'time_of_day', 'based_abroad')),
         case when exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'jobs') then 'legacy table present' else 'no legacy table here' end
  union all
  select 16, 'the new tables are empty',
         (select count(*) from public.callback_requests) = 0 and (select count(*) from public.callback_blocked_phones) = 0,
         (select 'requests ' || count(*) from public.callback_requests) || ', blocks ' || (select count(*) from public.callback_blocked_phones)
) checks
order by sort;
