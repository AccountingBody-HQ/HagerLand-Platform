-- Read-only check for migration 0042 (Jobs Phase 4: the recorded check behind the Verified badge, "Report this job",
-- private-client jobs). Run it in the Supabase SQL editor right after the migration. Every row should say PASS; rows
-- marked "(count)" report numbers for your records. It changes nothing.

with new_tables(name) as (values ('employer_verifications'), ('org_verification_notices'), ('job_reports')),
cols as (
  select table_name, column_name, column_default, is_nullable, ordinal_position from information_schema.columns
  where table_schema = 'public' and table_name in ('employer_verifications', 'org_verification_notices', 'job_reports', 'job_posts', 'jobs_public', 'jobs', 'organisations')
),
cons as (
  select c.relname as tbl, k.conname, pg_get_constraintdef(k.oid) as def from pg_constraint k join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
),
trig as (
  select c.relname as tbl, t.tgname, p.proname, p.prosecdef from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace join pg_proc p on p.oid = t.tgfoid
  where n.nspname = 'public' and not t.tgisinternal
),
grants as (
  select table_name, grantee from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC')
),
view_cols as (select column_name, ordinal_position from cols where table_name = 'jobs_public'),
expected_view(column_name, pos) as (
  values ('id', 1), ('short_id', 2), ('slug', 3), ('employer_org_id', 4), ('employer_name', 5), ('employer_slug', 6), ('employer_logo_path', 7),
         ('employer_verification', 8), ('title', 9), ('category', 10), ('employment_type', 11), ('location_id', 12), ('location_display', 13),
         ('country_code', 14), ('currency', 15), ('salary_min_minor', 16), ('salary_max_minor', 17), ('salary_period', 18), ('description', 19),
         ('requirements', 20), ('closing_date', 21), ('published_at', 22), ('expires_at', 23), ('updated_at', 24), ('search_tsv', 25), ('trade', 26), ('posted_for', 27)
),
legacy as (
  select count(*) as n from public.organisations o
  where o.verification_level = 'verified' and not exists (select 1 from public.employer_verifications v where v.organisation_id = o.id)
),
applied as (select applied_at from public.schema_migrations where version = '0042')
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from (
  select 1 as sort, 'migration 0042 is recorded' as check_name, exists (select 1 from applied) as ok,
         coalesce((select to_char(applied_at, 'YYYY-MM-DD HH24:MI') from applied), 'not recorded') as detail
  union all
  select 2, 'migrations 0034 to 0041 are still recorded',
         (select count(*) from public.schema_migrations where version in ('0034', '0035', '0036', '0037', '0038', '0039', '0040', '0041')) = 8,
         (select count(*)::text || ' of 8' from public.schema_migrations where version in ('0034', '0035', '0036', '0037', '0038', '0039', '0040', '0041'))
  union all
  select 3, 'the three new tables exist (verification checks, badge notices, job reports)',
         (select count(*) from information_schema.tables where table_schema = 'public' and table_name in (select name from new_tables)) = 3,
         (select count(*)::text || ' of 3' from information_schema.tables where table_schema = 'public' and table_name in (select name from new_tables))
  union all
  select 4, 'row level security is on for the three new tables',
         (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in (select name from new_tables) and c.relrowsecurity) = 3, ''
  union all
  select 5, 'visitors and signed-in users have no access to the new tables (no grants)',
         not exists (select 1 from grants where table_name in (select name from new_tables)),
         coalesce((select string_agg(distinct table_name || ':' || grantee, ', ') from grants where table_name in (select name from new_tables)), 'none')
  union all
  select 6, 'verification checks record licence, tax number, phone, who, when and the end date',
         (select count(*) from cols where table_name = 'employer_verifications' and column_name in ('licence_number', 'licence_expires_on', 'licence_checked_at', 'licence_check_method', 'tin_checked_at', 'phone_checked_at', 'phone_check_note', 'site_visit_at', 'verified_by', 'verified_at', 'valid_until', 'status', 'needs_recheck_since', 'revoked_at', 'revoked_by', 'revoked_reason')) = 16, ''
  union all
  select 7, 'a check lasts at most 12 months (or until the licence expires); a revoked badge needs a reason',
         exists (select 1 from cons where tbl = 'employer_verifications' and conname = 'employer_verifications_valid_until' and (def like '%1 year%' or def like '%12 mons%') and def like '%licence_expires_on%')
           and exists (select 1 from cons where tbl = 'employer_verifications' and conname = 'employer_verifications_revoked' and def like '%revoked_reason%'), ''
  union all
  select 8, 'job reports hold reason, details, contact, reporter, coded address, status, outcome, handling and deletion date',
         (select count(*) from cols where table_name = 'job_reports' and column_name in ('job_post_id', 'reason', 'details', 'contact', 'reporter_user_id', 'ip_hash', 'status', 'outcome', 'handled_by', 'handled_at', 'staff_note', 'personal_data_deleted_at')) = 12, ''
  union all
  select 9, 'job posts gain posted_for (default "employer") and the private-client fields',
         exists (select 1 from cols where table_name = 'job_posts' and column_name = 'posted_for' and column_default like '%employer%' and is_nullable = 'NO')
           and (select count(*) from cols where table_name = 'job_posts' and column_name in ('recruitment_assignment_id', 'created_by_staff', 'approved_by', 'self_approval_reason') and is_nullable = 'YES') = 4, ''
  union all
  select 10, 'private-client rules and four-eyes are database checks',
         exists (select 1 from cons where tbl = 'job_posts' and conname = 'job_posts_posted_for_rules' and def like '%private_client%' and def like '%ET%')
           and exists (select 1 from cons where tbl = 'job_posts' and conname = 'job_posts_four_eyes' and def like '%self_approval_reason%')
           and exists (select 1 from cons where tbl = 'job_posts' and conname = 'job_posts_staff_fields'), ''
  union all
  select 11, 'new triggers: badge needs a recorded check, re-check on name or licence change, no HagerLand Services members, private-client guard',
         exists (select 1 from trig where tbl = 'organisations' and tgname = 'organisations_verified_needs_evidence' and not prosecdef)
           and exists (select 1 from trig where tbl = 'organisations' and tgname = 'organisations_verification_recheck')
           and exists (select 1 from trig where tbl = 'organisation_members' and tgname = 'organisation_members_hagerland_services_guard')
           and exists (select 1 from trig where tbl = 'job_posts' and tgname = 'job_posts_private_client_guard'), ''
  union all
  select 12, 'the existing privileged-column triggers are still in place (organisations and job posts)',
         exists (select 1 from trig where tbl = 'organisations' and tgname = 'protect_privileged_columns')
           and exists (select 1 from trig where tbl = 'job_posts' and tgname = 'protect_privileged_columns')
           and exists (select 1 from trig where tbl = 'job_posts' and tgname = 'jobs_before_write'), ''
  union all
  select 13, 'the public job list keeps every column in the same order and adds posted_for at the end',
         (select count(*) from expected_view e join view_cols v on v.column_name = e.column_name and v.ordinal_position = e.pos) = 27
           and (select count(*) from view_cols) = 27,
         (select count(*)::text || ' columns' from view_cols)
  union all
  select 14, 'switches: private-client jobs Off, "Report this job" On, legacy badge clean-up Off',
         (select value from public.site_settings where key = 'jobs_private_client_posts') = 'false'::jsonb
           and (select value from public.site_settings where key = 'jobs_reports_enabled') = 'true'::jsonb
           and (select value from public.site_settings where key = 'org_verification_expiry') = 'false'::jsonb,
         coalesce((select string_agg(key || '=' || value::text, ', ' order by key) from public.site_settings where key in ('jobs_private_client_posts', 'jobs_reports_enabled', 'org_verification_expiry')), 'missing')
  union all
  select 15, 'Phase 2 and 3 switches unchanged: Apply by phone, worker register, recruitment desk Off; deletion Dry run; keeping period empty',
         (select value from public.site_settings where key = 'jobs_phone_apply') = 'false'::jsonb
           and (select value from public.site_settings where key = 'jobs_worker_register') = 'false'::jsonb
           and (select value from public.site_settings where key = 'jobs_recruitment_desk') = 'false'::jsonb
           and (select value from public.site_settings where key = 'jobs_data_cleanup_mode') = '"dry_run"'::jsonb
           and (select value from public.site_settings where key = 'jobs_fee_record_retention_months') = 'null'::jsonb, ''
  union all
  select 16, 'the new settings are never public (not in site_settings_public)',
         not exists (select 1 from public.site_settings_public where key in ('jobs_private_client_posts', 'jobs_reports_enabled', 'org_verification_expiry')), ''
  union all
  select 17, 'the old site''s "jobs" table is untouched',
         not exists (select 1 from cols where table_name = 'jobs' and column_name in ('posted_for', 'recruitment_assignment_id', 'created_by_staff', 'approved_by', 'self_approval_reason'))
           and not exists (select 1 from trig where tbl = 'jobs' and tgname in ('job_posts_private_client_guard')),
         case when exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'jobs') then 'legacy table present' else 'no legacy table here' end
  union all
  select 18, 'no job post is anything but an ordinary employer job',
         not exists (select 1 from public.job_posts where posted_for <> 'employer'),
         (select count(*)::text || ' job posts' from public.job_posts)
  union all
  select 19, 'HagerLand Services has no members',
         not exists (select 1 from public.organisation_members m join public.organisations o on o.id = m.org_id where o.slug = 'hagerland-services'), ''
  union all
  select 20, '(count) legacy Verified businesses (verified before the recorded check; left as they are)',
         true, (select n::text from legacy)
  union all
  select 21, '(count) new rows after the migration (all should be 0)',
         true, (select 'checks ' || count(*) from public.employer_verifications) || ', notices ' || (select count(*) from public.org_verification_notices) || ', reports ' || (select count(*) from public.job_reports)
) checks
order by sort;
