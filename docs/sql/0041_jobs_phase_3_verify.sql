-- Read-only check for migration 0041 (Jobs Phase 3: HagerLand's recruitment desk). Run it in the Supabase SQL editor
-- right after the migration. Every row should say PASS; rows marked "(count)" report numbers for your records. It
-- changes nothing.

with desk(name) as (
  values ('recruitment_assignments'), ('recruitment_candidates'), ('recruitment_events'), ('recruitment_placements'), ('recruitment_fee_terms'), ('recruitment_fee_entries')
),
cols as (
  select table_name, column_name, is_nullable, is_generated from information_schema.columns
  where table_schema = 'public' and table_name in (select name from desk union all values ('service_requests'), ('deals'), ('job_applications'), ('worker_register'), ('candidate_profiles'), ('jobs'))
),
cons as (
  select c.relname as tbl, k.conname, k.contype, pg_get_constraintdef(k.oid) as def from pg_constraint k join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
),
trig as (
  select c.relname as tbl, t.tgname, p.proname, pg_get_functiondef(p.oid) as fn from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace join pg_proc p on p.oid = t.tgfoid
  where n.nspname = 'public' and not t.tgisinternal
),
grants as (
  select table_name, grantee, privilege_type from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon', 'authenticated', 'PUBLIC')
),
applied as (select applied_at from public.schema_migrations where version = '0041')
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from (
  select 1 as sort, 'the six recruitment desk tables exist' as check_name,
         (select count(*) from information_schema.tables where table_schema = 'public' and table_name in (select name from desk)) = 6 as ok,
         (select count(*)::text || ' of 6' from information_schema.tables where table_schema = 'public' and table_name in (select name from desk)) as detail
  union all
  select 2, 'row level security is on for every desk table',
         (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in (select name from desk) and c.relrowsecurity) = 6,
         (select count(*)::text || ' of 6 with row level security' from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in (select name from desk) and c.relrowsecurity)
  union all
  select 3, 'visitors and signed-in users have no access at all to the desk tables (no grants)',
         not exists (select 1 from grants where table_name in (select name from desk)),
         coalesce((select string_agg(distinct table_name || ':' || grantee, ', ') from grants where table_name in (select name from desk)), 'none')
  union all
  select 4, 'assignments: one per staffing request, with the "based outside Ethiopia" answer',
         exists (select 1 from cons where tbl = 'recruitment_assignments' and contype = 'u' and def like '%service_request_id%')
           and (select count(*) from cols where table_name = 'recruitment_assignments' and column_name in ('employer_based_abroad', 'employer_country', 'private_client', 'employer_org_id', 'roles', 'headcount', 'pay_text', 'start_date')) = 8, ''
  union all
  select 5, 'assignments are only for staffing requests and only for work in Ethiopia (database rule)',
         exists (select 1 from trig where tbl = 'recruitment_assignments' and proname = 'recruitment_assignment_guard' and fn like '%staffing%' and fn like '%''ET''%'), ''
  union all
  select 6, 'shortlist rows record consent: when, how, who recorded it, a note, withdrawal and refusal',
         (select count(*) from cols where table_name = 'recruitment_candidates' and column_name in ('consent_at', 'consent_method', 'consent_recorded_by', 'consent_note', 'consent_withdrawn_at', 'consent_withdrawn_by', 'declined_at')) = 7, ''
  union all
  select 7, 'shortlist rows record which contact details may be shared (phone, WhatsApp, Telegram, SMS, email)',
         (select count(*) from cols where table_name = 'recruitment_candidates' and column_name in ('share_phone', 'share_whatsapp', 'share_telegram', 'share_sms', 'share_email')) = 5, ''
  union all
  select 8, 'shortlist rows record the 18+ confirmation (when, by whom, how)',
         (select count(*) from cols where table_name = 'recruitment_candidates' and column_name in ('adult_confirmed_at', 'adult_confirmed_by', 'adult_confirmed_method')) = 3, ''
  union all
  select 9, 'nobody is introduced without consent and a confirmed 18+, or after refusing or withdrawing (database rule)',
         exists (select 1 from cons where tbl = 'recruitment_candidates' and conname = 'recruitment_candidates_introduction_rules'
                 and def like '%consent_at IS NOT NULL%' and def like '%adult_confirmed_at IS NOT NULL%' and def like '%declined_at IS NULL%' and def like '%consent_withdrawn_at%'), ''
  union all
  select 10, 'consent needs how it was given, who recorded it and at least one shared contact method (database rule)',
         exists (select 1 from cons where tbl = 'recruitment_candidates' and conname = 'recruitment_candidates_consent_complete' and def like '%share_phone%' and def like '%share_email%'), ''
  union all
  select 11, 'consent, a withdrawal, a refusal and an introduction can never be undone (trigger)',
         exists (select 1 from trig where tbl = 'recruitment_candidates' and proname = 'recruitment_candidate_guard' and fn like '%withdrawal of consent cannot be undone%' and fn like '%introduction cannot be undone%'), ''
  union all
  select 12, 'the desk timeline cannot be changed, deleted or emptied',
         (select count(*) from trig where tbl = 'recruitment_events' and proname = 'supply_append_only') = 2, ''
  union all
  select 13, 'placements hold no money (no amount, fee or percentage columns)',
         not exists (select 1 from cols where table_name in ('recruitment_placements', 'recruitment_assignments', 'recruitment_candidates', 'recruitment_events') and (column_name like '%amount%' or column_name like '%fee%' or column_name like '%percent%' or column_name like '%bps%')), ''
  union all
  select 14, 'placements: the guarantee end date is worked out by the database; free replacements are marked by the database',
         exists (select 1 from cols where table_name = 'recruitment_placements' and column_name = 'guarantee_ends_on' and is_generated = 'ALWAYS')
           and exists (select 1 from trig where tbl = 'recruitment_placements' and proname = 'recruitment_placement_guard' and fn like '%is_free_replacement%'), ''
  union all
  select 15, 'a fee is either a fixed amount or a percentage (never both); agreed terms need the date agreed in writing',
         exists (select 1 from cons where tbl = 'recruitment_fee_terms' and conname = 'recruitment_fee_terms_type' and def like '%fixed%' and def like '%percentage%')
           and exists (select 1 from cons where tbl = 'recruitment_fee_terms' and conname = 'recruitment_fee_terms_agreed' and def like '%agreed_in_writing_on%'), ''
  union all
  select 16, 'no fee on a free replacement (database rule)',
         exists (select 1 from trig where tbl = 'recruitment_fee_terms' and proname = 'recruitment_fee_terms_guard' and fn like '%free replacement has no fee%'), ''
  union all
  select 17, 'fee entries cannot be changed or deleted, and each is reversed at most once',
         (select count(*) from trig where tbl = 'recruitment_fee_entries' and proname = 'supply_append_only') = 2
           and exists (select 1 from cons where tbl = 'recruitment_fee_entries' and contype = 'u' and def like '%reverses_entry_id%')
           and exists (select 1 from trig where tbl = 'recruitment_fee_entries' and proname = 'recruitment_fee_entries_guard'), ''
  union all
  select 18, 'the fee agreements storage folder (recruitment-private) is private',
         exists (select 1 from storage.buckets where id = 'recruitment-private' and public = false),
         coalesce((select case when public then 'PUBLIC' else 'private' end from storage.buckets where id = 'recruitment-private'), 'missing')
  union all
  select 19, 'the recruitment desk switch is Off; the keeping period for hired people is empty',
         (select value from public.site_settings where key = 'jobs_recruitment_desk') = 'false'::jsonb
           and (select value from public.site_settings where key = 'jobs_fee_record_retention_months') = 'null'::jsonb,
         coalesce((select string_agg(key || '=' || value::text, ', ' order by key) from public.site_settings where key in ('jobs_recruitment_desk', 'jobs_fee_record_retention_months')), 'missing')
  union all
  select 20, 'Phase 2 switches are still Off and deletion is still on Dry run',
         (select value from public.site_settings where key = 'jobs_phone_apply') = 'false'::jsonb
           and (select value from public.site_settings where key = 'jobs_worker_register') = 'false'::jsonb
           and (select value from public.site_settings where key = 'jobs_data_cleanup_mode') = '"dry_run"'::jsonb,
         coalesce((select string_agg(key || '=' || value::text, ', ' order by key) from public.site_settings where key in ('jobs_phone_apply', 'jobs_worker_register', 'jobs_data_cleanup_mode')), 'missing')
  union all
  select 21, 'the new settings are never public (not in site_settings_public)',
         not exists (select 1 from public.site_settings_public where key in ('jobs_recruitment_desk', 'jobs_fee_record_retention_months')), ''
  union all
  select 22, 'service requests, deals, applications, the worker register and candidate profiles are unchanged (no desk columns or triggers)',
         not exists (select 1 from cols where table_name in ('service_requests', 'deals', 'job_applications', 'worker_register', 'candidate_profiles') and (column_name like '%recruit%' or column_name in ('employer_based_abroad', 'employer_country', 'introduced_at', 'retain_until')))
           and not exists (select 1 from trig where tbl in ('service_requests', 'deals', 'job_applications', 'worker_register', 'candidate_profiles') and proname like 'recruitment%')
           and not exists (select 1 from cons where tbl = 'deals' and def like '%recruit%'), ''
  union all
  select 23, 'the old site''s "jobs" table is untouched',
         not exists (select 1 from cols where table_name = 'jobs' and (column_name like '%recruit%' or column_name in ('consent_at', 'introduced_at', 'retain_until')))
           and not exists (select 1 from trig where tbl = 'jobs' and proname like 'recruitment%'),
         case when exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'jobs') then 'legacy table present' else 'no legacy table here' end
  union all
  select 24, 'earlier tables (0034 to 0040) are still there',
         (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('supply_partners', 'supply_contacts', 'supplier_offers', 'supply_quote_lines', 'supply_agreements', 'supply_orders', 'supply_order_lines', 'supply_order_events', 'supply_delivery_proofs', 'supply_ledger_entries', 'org_field_sources', 'import_cleanup_runs', 'worker_register', 'job_data_cleanup_runs')) = 14, ''
  union all
  select 25, '(count) recruitment desk rows after the migration (all should be 0)',
         true, (select 'assignments ' || count(*) from public.recruitment_assignments) || ', shortlist ' || (select count(*) from public.recruitment_candidates) || ', placements ' || (select count(*) from public.recruitment_placements) || ', fee terms ' || (select count(*) from public.recruitment_fee_terms)
  union all
  select 26, 'migration 0041 is recorded',
         exists (select 1 from applied), coalesce((select to_char(applied_at, 'YYYY-MM-DD HH24:MI') from applied), 'not recorded')
) checks
order by sort;
