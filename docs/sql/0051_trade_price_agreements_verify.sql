-- Read-only check for migration 0051 (S6-4 per-customer trade prices and multi-item trade order requests). Run it in the
-- Supabase SQL editor right after the migration. Every row should say PASS; the "detail" column shows the evidence.
-- It changes nothing. The last row only shows the record count of the new table (information: expected 0).

with setting(key, value) as (select key, value from public.site_settings),
grants as (
  select grantee, privilege_type from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'trade_price_agreements' and grantee in ('anon', 'authenticated')
),
internal(name) as (
  values ('supply_product_payable_floor'), ('supply_product_suggested_price'), ('trade_agreement_price'), ('trade_effective_price_for'),
         ('trade_price_agreements_guard'), ('order_request_reserve')
),
checks(name) as (
  values ('trade_price_agreements_one_target'), ('trade_price_agreements_one_price'), ('trade_price_agreements_dates'), ('trade_price_agreements_end_reason')
)
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from (
  select 1 as sort, '0051 is recorded, and 0034–0050 are still recorded' as check_name,
         exists (select 1 from public.schema_migrations where version = '0051')
           and (select count(*) from public.schema_migrations where version between '0034' and '0050') = 17 as ok,
         (select string_agg(version, ', ' order by version) from public.schema_migrations where version >= '0034') as detail
  union all
  select 2, 'the new table exists with row level security on, no grants to visitors or signed-in users, and no policies',
         exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'trade_price_agreements' and c.relkind = 'r' and c.relrowsecurity)
           and not exists (select 1 from grants)
           and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'trade_price_agreements'),
         coalesce((select 'trade_price_agreements=' || case when c.relrowsecurity then 'RLS on' else 'RLS OFF' end from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'trade_price_agreements'), 'missing')
           || '; grants: ' || coalesce((select string_agg(grantee || ':' || privilege_type, ', ') from grants), 'none')
           || '; policies: ' || (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'trade_price_agreements')
  union all
  select 3, 'the rules exist: a product or a category (not both), a price or a discount (not both), discount 0.01%–90%, dates in order, overlaps and below-payable prices refused',
         (select count(*) from pg_constraint where conrelid = 'public.trade_price_agreements'::regclass and conname in (select name from checks) and convalidated) = 4
           and exists (select 1 from pg_constraint where conrelid = 'public.trade_price_agreements'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%discount_bps >= 1%' and pg_get_constraintdef(oid) like '%discount_bps <= 9000%')
           and exists (select 1 from pg_trigger g where g.tgrelid = 'public.trade_price_agreements'::regclass and g.tgname = 'trade_price_agreements_guard' and not g.tgisinternal and g.tgenabled <> 'D')
           and exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'trade_price_agreements_guard'
                         and p.prosrc like '%daterange(x.valid_from, x.valid_until, ''[]'') && daterange(new.valid_from, new.valid_until, ''[]'')%'
                         and p.prosrc like '%Below what HagerLand pays the partner%'),
         (select string_agg(conname || ' = ' || pg_get_constraintdef(oid), ' | ' order by conname) from pg_constraint where conrelid = 'public.trade_price_agreements'::regclass and contype = 'c')
           || '; trigger: ' || coalesce((select string_agg(g.tgname, ', ') from pg_trigger g where g.tgrelid = 'public.trade_price_agreements'::regclass and not g.tgisinternal), 'missing')
  union all
  select 4, 'my_trade_prices exists, runs with its owner''s rights, and only signed-in users may call it (not visitors)',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'my_trade_prices' and p.prosecdef
                   and has_function_privilege('authenticated', p.oid, 'execute') and not has_function_privilege('anon', p.oid, 'execute')),
         coalesce((select 'security definer=' || p.prosecdef || ', authenticated=' || has_function_privilege('authenticated', p.oid, 'execute') || ', anon=' || has_function_privilege('anon', p.oid, 'execute') || ', returns ' || pg_get_function_result(p.oid)
                   from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'my_trade_prices'), 'missing')
  union all
  select 5, 'the internal steps (price for a customer, partner payable, agreement guard, the new reserve step) are for the server only; the reserve step uses trade prices only while the switch is on',
         (select count(distinct p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in (select name from internal)) = 6
           and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in (select name from internal)
                             and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute')))
           and exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'order_request_reserve'
                         and p.prosrc like '%st.key = ''supply_trade_pricing'' and st.value = ''true''::jsonb%' and p.prosrc like '%A customer price is below what HagerLand pays the partner for that item%'),
         (select count(distinct p.proname)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in (select name from internal)) || ' of 6 functions; '
           || 'visitors or signed-in users may run: ' || coalesce((select string_agg(distinct p.proname, ', ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in (select name from internal) and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))), 'none')
  union all
  select 6, 'the existing general trade price (product_trade_prices) is unchanged: same body, signed-in users only',
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'product_trade_prices'
                   and md5(p.prosrc) = '5877b152467bfcbecba9e39622c957c2' and p.prosecdef
                   and has_function_privilege('authenticated', p.oid, 'execute') and not has_function_privilege('anon', p.oid, 'execute')),
         coalesce((select 'md5=' || md5(p.prosrc) || '; ' || regexp_replace(pg_get_functiondef(p.oid), '\s+', ' ', 'g') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'product_trade_prices'), 'missing')
  union all
  select 7, 'every switch unchanged: catalogue ordering, registration, homepage row, trade pricing Off; clean-ups on Dry run; the Jobs switches as before; payment details empty',
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
  select 8, 'the old site''s "jobs" table is untouched (no policy)',
         not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'jobs'),
         case when exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'jobs')
           then 'legacy table present: ' || (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.jobs', false, true, '')))[1]::text || ' rows, '
             || (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'jobs') || ' policies'
           else 'no legacy table here' end
  union all
  select 9, 'record count of the new table (information; expected 0 right after the migration)', true,
         'trade_price_agreements=' || (select count(*)::text from public.trade_price_agreements)
) checks
order by sort;
