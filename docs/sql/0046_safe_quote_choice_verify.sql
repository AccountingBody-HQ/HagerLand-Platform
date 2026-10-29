-- Read-only check for migration 0046 (Fix F-3: choosing a quote is all or nothing; one deal per chosen request).
-- Run it in the Supabase SQL editor right after the migration. Every row should say PASS; the "detail" column shows
-- the evidence. It changes nothing. Rows 6 and 7 can also be run before the migration: they show whether any
-- duplicate deals exist (the migration stops by itself, changing nothing, if they do).

with cols as (
  select table_name, column_name from information_schema.columns
  where table_schema = 'public' and table_name in ('service_requests', 'service_request_matches', 'deals', 'jobs')
),
fn as (
  select p.oid, p.prosecdef, p.proconfig, pg_get_functiondef(p.oid) as def from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'choose_service_request_quote'
),
pol as (
  select tablename, string_agg(policyname, ' | ' order by policyname) as names, count(*) as n from pg_policies
  where schemaname = 'public' and tablename in ('service_requests', 'service_request_matches', 'deals') group by tablename
),
trg as (
  select c.relname as tbl, string_agg(t.tgname, ', ' order by t.tgname) as names from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname in ('service_requests', 'service_request_matches', 'deals', 'jobs') and not t.tgisinternal group by c.relname
),
dup as (
  select source_id from public.deals where source_type = 'service_request' and match_id is not null group by source_id having count(*) > 1
),
setting(key, value) as (select key, value from public.site_settings),
applied as (select applied_at from public.schema_migrations where version = '0046')
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from (
  select 1 as sort, 'migration 0046 is recorded' as check_name, exists (select 1 from applied) as ok,
         coalesce((select to_char(applied_at, 'YYYY-MM-DD HH24:MI') from applied), 'not recorded') as detail
  union all
  select 2, 'migrations 0034 to 0045 are still recorded',
         (select count(*) from public.schema_migrations where version in ('0034', '0035', '0036', '0037', '0038', '0039', '0040', '0041', '0042', '0043', '0044', '0045')) = 12,
         (select count(*)::text || ' of 12' from public.schema_migrations where version in ('0034', '0035', '0036', '0037', '0038', '0039', '0040', '0041', '0042', '0043', '0044', '0045'))
  union all
  select 3, 'the quote choice function exists, runs with the owner''s rights and an empty search path',
         exists (select 1 from fn where prosecdef and proconfig = array['search_path=""']),
         coalesce((select 'security definer=' || prosecdef::text || ', settings=' || coalesce(array_to_string(proconfig, ' '), 'none') from fn), 'missing')
  union all
  select 4, 'visitors and signed-in users cannot run it; the website (service role) can',
         coalesce(exists (select 1 from fn)
           and not has_function_privilege('anon', (select oid from fn), 'execute')
           and not has_function_privilege('authenticated', (select oid from fn), 'execute')
           and not exists (select 1 from fn, aclexplode(coalesce((select proacl from pg_proc where oid = fn.oid), acldefault('f', 0))) a where a.grantee = 0)
           and has_function_privilege('service_role', (select oid from fn), 'execute'), false),
         coalesce((select array_to_string(proacl, ', ') from pg_proc where oid = (select oid from fn)), 'missing')
  union all
  select 5, 'the one-deal-per-chosen-request index exists (deals from a chosen quote only)',
         exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'deals' and indexname = 'deals_service_request_choice_key'
           and indexdef like 'CREATE UNIQUE INDEX%(source_id)%' and indexdef like '%source_type = ''service_request''%' and indexdef like '%match_id IS NOT NULL%'),
         coalesce((select indexdef from pg_indexes where schemaname = 'public' and indexname = 'deals_service_request_choice_key'), 'missing')
  union all
  select 6, 'no service request has more than one deal from a chosen quote',
         not exists (select 1 from dup),
         (select count(*)::text || ' requests with duplicates' from dup)
  union all
  select 7, 'deals from chosen quotes so far (expected 0 on live)',
         (select count(*) from public.deals where source_type = 'service_request' and match_id is not null) = 0,
         (select count(*)::text || ' deals from chosen quotes; ' from public.deals where source_type = 'service_request' and match_id is not null)
           || (select count(*)::text || ' deals in the ledger in total' from public.deals)
  union all
  select 8, 'service requests: all 35 columns, row level security on, one policy, triggers unchanged',
         (select count(*) from cols where table_name = 'service_requests') = 35
           and (select count(*) from cols where table_name = 'service_requests' and column_name in ('access_token_expires_at', 'access_token_hash', 'admin_alerted_at', 'admin_notes', 'answers', 'attachment_paths', 'budget_band', 'closed_at', 'closed_reason', 'country_code', 'created_at', 'currency', 'details', 'email', 'id', 'ip_hash', 'location_id', 'location_text', 'matched_at', 'name', 'phone', 'preferred_contact', 'project_id', 'reference', 'requester_user_id', 'service_category_id', 'source', 'source_url', 'status', 'title', 'triaged_at', 'updated_at', 'urgency', 'utm', 'vertical_key')) = 35
           and exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'service_requests' and c.relrowsecurity)
           and (select names from pol where tablename = 'service_requests') = 'Requesters read own service requests'
           and (select names from trg where tbl = 'service_requests') = 'service_requests_sync_country, set_updated_at',
         (select count(*)::text || ' columns; ' from cols where table_name = 'service_requests') || coalesce((select n::text || ' policy: ' || names from pol where tablename = 'service_requests'), 'no policies') || '; triggers: ' || coalesce((select names from trg where tbl = 'service_requests'), 'none')
  union all
  select 9, 'matches: all 21 columns, row level security on, three policies, triggers unchanged',
         (select count(*) from cols where table_name = 'service_request_matches') = 21
           and (select count(*) from cols where table_name = 'service_request_matches' and column_name in ('commission_minor', 'commission_rate', 'created_at', 'declined_reason', 'id', 'invoiced', 'invoiced_at', 'lead_fee_minor', 'offered_at', 'org_id', 'quote_amount_minor', 'quote_currency', 'quote_document_path', 'quote_message', 'quote_valid_until', 'quoted_at', 'reminder_sent_at', 'request_id', 'responded_at', 'status', 'updated_at')) = 21
           and exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'service_request_matches' and c.relrowsecurity)
           and (select names from pol where tablename = 'service_request_matches') = 'Providers answer their matches | Providers read their matches | Requesters read quotes on their requests'
           and (select names from trg where tbl = 'service_request_matches') = 'protect_match_transitions, set_updated_at',
         (select count(*)::text || ' columns; ' from cols where table_name = 'service_request_matches') || coalesce((select n::text || ' policies'  from pol where tablename = 'service_request_matches'), 'no policies') || '; triggers: ' || coalesce((select names from trg where tbl = 'service_request_matches'), 'none')
  union all
  select 10, 'deals: all 17 columns, row level security on, no policies (HagerLand only), triggers unchanged',
         (select count(*) from cols where table_name = 'deals') = 17
           and (select count(*) from cols where table_name = 'deals' and column_name in ('closed_at', 'commission_minor', 'created_at', 'currency', 'id', 'lead_fee_minor', 'match_id', 'notes', 'org_id', 'pillar_key', 'reference', 'source_id', 'source_type', 'status', 'title', 'updated_at', 'value_minor')) = 17
           and exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'deals' and c.relrowsecurity)
           and not exists (select 1 from pol where tablename = 'deals')
           and (select names from trg where tbl = 'deals') = 'set_updated_at',
         (select count(*)::text || ' columns; ' from cols where table_name = 'deals') || coalesce((select n::text || ' policies' from pol where tablename = 'deals'), 'no policies') || '; triggers: ' || coalesce((select names from trg where tbl = 'deals'), 'none')
  union all
  select 11, 'visitors and signed-in users still have no access to deals; table grants on requests and matches unchanged',
         not exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name = 'deals' and grantee in ('anon', 'authenticated', 'PUBLIC'))
           and not exists (select 1 from information_schema.column_privileges where table_schema = 'public' and table_name = 'deals' and grantee in ('anon', 'authenticated', 'PUBLIC'))
           and not exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name in ('service_requests', 'service_request_matches') and grantee in ('anon', 'authenticated', 'PUBLIC'))
           and (select count(*) from information_schema.column_privileges where table_schema = 'public' and table_name = 'service_requests' and grantee = 'authenticated') = 26
           and (select count(*) from information_schema.column_privileges where table_schema = 'public' and table_name = 'service_request_matches' and grantee = 'authenticated') = 24
           and not exists (select 1 from information_schema.column_privileges where table_schema = 'public' and table_name in ('service_requests', 'service_request_matches') and grantee in ('anon', 'PUBLIC')),
         'signed-in column grants: requests ' || (select count(*) from information_schema.column_privileges where table_schema = 'public' and table_name = 'service_requests' and grantee = 'authenticated')::text
           || ', matches ' || (select count(*) from information_schema.column_privileges where table_schema = 'public' and table_name = 'service_request_matches' and grantee = 'authenticated')::text
  union all
  select 12, 'every switch unchanged: phone apply, register, desk, private-client, badge clean-up, Amharic for Jobs, call-backs, site-wide Amharic Off; reports On; Jobs deletion and Imports clean-up Dry run; keeping period empty',
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
  select 13, 'the old site''s "jobs" table is untouched (no 0046 index on it; the function never mentions it)',
         not exists (select 1 from pg_indexes where schemaname = 'public' and tablename = 'jobs' and indexname = 'deals_service_request_choice_key')
           and not exists (select 1 from fn where def ~ 'public\.jobs\M'),
         case when exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'jobs')
           then 'legacy table present, ' || (select count(*)::text from cols where table_name = 'jobs') || ' columns, triggers: ' || coalesce((select names from trg where tbl = 'jobs'), 'none')
           else 'no legacy table here' end
) checks
order by sort;
