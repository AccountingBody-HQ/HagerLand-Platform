-- Read-only check for migration 0052 (QC-1b one-step service-request cancel, and the trigger-function tidy). Run it in
-- the Supabase SQL editor right after the migration. Every row should say PASS; the "detail" column shows the evidence.
-- It changes nothing.

with setting(key, value) as (select key, value from public.site_settings),
ledger_checks as (
  select conname, pg_get_constraintdef(oid) as def from pg_constraint where conrelid = 'public.supply_ledger_entries'::regclass and contype = 'c'
),
cancel_fn as (
  select p.oid, p.prosecdef, p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'service_request_cancel' and pg_get_function_identity_arguments(p.oid) = 'p_request_id uuid, p_actor_user_id uuid, p_token_hash text'
),
trig(fn, tbl) as (
  values ('add_owner_on_org_insert', 'public.organisations'), ('agency_instruction_marks_listing', 'public.agency_instructions'),
         ('create_profile_on_signup', 'auth.users'), ('pillars_after_change', 'public.pillars'), ('pillars_after_change', 'public.pillar_services'),
         ('protect_last_owner', 'public.organisation_members'), ('sync_featured_from_promotions', 'public.promotions'), ('reviews_check_eligible', 'public.reviews')
),
trig_fn as (
  select distinct t.fn, p.oid from trig t join pg_proc p on p.proname = t.fn join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
),
attached as (
  select t.fn, t.tbl, exists (
    select 1 from pg_trigger g join pg_proc p on p.oid = g.tgfoid join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = t.fn and g.tgrelid = t.tbl::regclass and not g.tgisinternal and g.tgenabled <> 'D'
  ) as ok
  from trig t
),
no_rls as (
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
)
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from (
  select 1 as sort, '0052 is recorded, and 0034–0051 are still recorded' as check_name,
         exists (select 1 from public.schema_migrations where version = '0052')
           and (select count(*) from public.schema_migrations where version between '0034' and '0051') = 18 as ok,
         (select string_agg(version, ', ' order by version) from public.schema_migrations where version >= '0034') as detail
  union all
  select 2, 'the one-step cancel exists, runs as its owner (security definer) with a fixed search path',
         exists (select 1 from cancel_fn where prosecdef and proconfig @> array['search_path=""']),
         coalesce((select 'security definer=' || prosecdef::text || '; settings=' || coalesce(array_to_string(proconfig, ','), 'none') from cancel_fn), 'missing')
  union all
  select 3, 'only the website (service role) can run the one-step cancel: not visitors, signed-in users or public',
         exists (select 1 from cancel_fn)
           and (select has_function_privilege('service_role', oid, 'execute') and not has_function_privilege('anon', oid, 'execute')
                  and not has_function_privilege('authenticated', oid, 'execute') from cancel_fn)
           and (select not exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0 and a.privilege_type = 'EXECUTE')
                from pg_proc p join cancel_fn c on c.oid = p.oid),
         coalesce((select coalesce(array_to_string(p.proacl::text[], ' '), 'default (public)') from pg_proc p join cancel_fn c on c.oid = p.oid), 'missing')
  union all
  select 4, 'the seven trigger functions cannot be run by visitors, signed-in users or public',
         (select count(*) from trig_fn) = 7
           and not exists (
             select 1 from trig_fn f join pg_proc p on p.oid = f.oid
             where has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')
               or exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0 and a.privilege_type = 'EXECUTE')
           ),
         (select string_agg(f.fn || ': anon=' || has_function_privilege('anon', f.oid, 'execute')::text || ' authenticated=' || has_function_privilege('authenticated', f.oid, 'execute')::text, '; ' order by f.fn) from trig_fn f)
  union all
  select 5, 'each of them is still attached to its trigger(s), switched on',
         (select count(*) from attached) = 8 and not exists (select 1 from attached where not ok),
         (select string_agg(fn || ' on ' || tbl || '=' || case when ok then 'attached' else 'MISSING' end, '; ' order by fn, tbl) from attached)
  union all
  select 6, 'property_unavailable (the public "no longer available" lookup, not a trigger) still works for visitors',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'property_unavailable' and has_function_privilege('anon', p.oid, 'execute')),
         coalesce((select coalesce(array_to_string(p.proacl::text[], ' '), 'default (public)') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'property_unavailable'), 'missing')
  union all
  select 7, 'the supply ledger''s 16 checks are exactly as before (fingerprint)',
         (select md5(string_agg(conname || '=' || def, E'\n' order by conname)) from ledger_checks) = '6fc7e5654337f30b914fbeb1489856e8'
           and (select count(*) from ledger_checks) = 16,
         'md5=' || coalesce((select md5(string_agg(conname || '=' || def, E'\n' order by conname)) from ledger_checks), 'none') || '; checks=' || (select count(*)::text from ledger_checks)
  union all
  select 8, 'row level security is on for every table in the public schema',
         not exists (select 1 from no_rls),
         coalesce('RLS OFF: ' || (select string_agg(relname, ', ' order by relname) from no_rls), 'all tables RLS on')
  union all
  select 9, 'every switch unchanged: catalogue ordering, registration, homepage row, trade pricing Off; clean-ups on Dry run; Report this job On, the other Jobs switches Off; payment details empty',
         (select value from setting where key = 'supply_catalogue_ordering') = 'false'::jsonb
           and (select value from setting where key = 'supply_partner_registration') = 'false'::jsonb
           and (select value from setting where key = 'home_business_row') = 'false'::jsonb
           and (select value from setting where key = 'supply_trade_pricing') = 'false'::jsonb
           and (select value from setting where key = 'supply_payment_details') = '""'::jsonb
           and (select value from setting where key = 'jobs_data_cleanup_mode') = '"dry_run"'::jsonb
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
         coalesce((select string_agg(key || '=' || value::text, ', ' order by key) from setting where key in ('supply_catalogue_ordering', 'supply_partner_registration', 'home_business_row', 'supply_trade_pricing', 'supply_payment_details', 'jobs_data_cleanup_mode', 'imports_cleanup_mode', 'jobs_phone_apply', 'jobs_worker_register', 'jobs_recruitment_desk', 'jobs_private_client_posts', 'org_verification_expiry', 'jobs_amharic', 'jobs_callbacks', 'amharic_enabled', 'jobs_reports_enabled')), 'missing')
  union all
  select 10, 'the old site''s "jobs" table is untouched (no policy)',
         not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'jobs'),
         case when exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'jobs')
           then 'legacy table present: ' || (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'jobs') || ' policies'
           else 'no legacy table here' end
) checks
order by sort;
