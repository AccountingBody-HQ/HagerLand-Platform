-- Read-only check for migration 0049 (S6-2 order requests, stock reservations and the payment window). Run it in the
-- Supabase SQL editor right after the migration. Every row should say PASS; the "detail" column shows the evidence.
-- It changes nothing. The last row only shows the record counts of the new tables (information: expected all 0).

with t(name) as (
  values ('order_requests'), ('order_request_lines'), ('stock_reservations'), ('order_request_events'), ('order_request_payments')
),
setting(key, value) as (select key, value from public.site_settings),
grants as (
  select table_name, grantee, privilege_type from information_schema.role_table_grants
  where table_schema = 'public' and table_name in (select name from t) and grantee in ('anon', 'authenticated')
),
colgrants as (
  select table_name, column_name, grantee, privilege_type from information_schema.column_privileges
  where table_schema = 'public' and table_name in (select name from t) and grantee in ('anon', 'authenticated')
),
fn(name) as (
  values ('order_request_transition_allowed'), ('order_requests_guard'), ('order_requests_after'), ('order_request_lines_guard'),
         ('order_request_payments_guard'), ('order_request_payments_after'), ('order_request_settle'), ('order_request_net_cents'),
         ('order_request_received_cents'), ('order_request_held_cents'), ('order_request_submit'), ('order_request_reserve'),
         ('order_request_expire_due'), ('order_request_create_supply_orders'), ('order_request_claim_email'), ('supply_orders_sync_order_request')
),
trg(name, tbl) as (
  values ('order_requests_guard', 'order_requests'), ('order_requests_after', 'order_requests'), ('order_request_lines_guard', 'order_request_lines'),
         ('order_request_payments_guard', 'order_request_payments'), ('order_request_payments_after', 'order_request_payments'),
         ('order_request_payments_append_only', 'order_request_payments'), ('order_request_payments_no_truncate', 'order_request_payments'),
         ('order_request_events_append_only', 'order_request_events'), ('order_request_events_no_truncate', 'order_request_events'),
         ('supply_orders_sync_order_request', 'supply_orders')
),
counts as (
  select 'order_requests' as name, count(*) as n from public.order_requests
  union all select 'order_request_lines', count(*) from public.order_request_lines
  union all select 'stock_reservations', count(*) from public.stock_reservations
  union all select 'order_request_events', count(*) from public.order_request_events
  union all select 'order_request_payments', count(*) from public.order_request_payments
)
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from (
  select 1 as sort, '0049 is recorded, and 0034–0048 are still recorded' as check_name,
         exists (select 1 from public.schema_migrations where version = '0049')
           and (select count(*) from public.schema_migrations where version between '0034' and '0048') = 15 as ok,
         (select string_agg(version, ', ' order by version) from public.schema_migrations where version >= '0034') as detail
  union all
  select 2, 'the five new tables exist, each with row level security on',
         (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in (select name from t) and c.relkind = 'r' and c.relrowsecurity) = 5,
         coalesce((select string_agg(c.relname || '=' || case when c.relrowsecurity then 'RLS on' else 'RLS OFF' end, ', ' order by c.relname)
                   from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in (select name from t)), 'missing')
  union all
  select 3, 'visitors have no access; signed-in users may only read their own order request (customer columns, one policy); nothing else is granted',
         not exists (select 1 from grants)
           and not exists (select 1 from colgrants where grantee = 'anon')
           and not exists (select 1 from colgrants where table_name <> 'order_requests')
           and not exists (select 1 from colgrants where privilege_type <> 'SELECT')
           and not exists (select 1 from colgrants where column_name in ('access_token_hash', 'access_token_expires_at', 'ip_hash', 'requester_user_id', 'emails_sent', 'updated_by', 'status_reason', 'personal_data_deleted_at'))
           and (select count(*) from pg_policies where schemaname = 'public' and tablename in (select name from t)) = 1
           and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'order_requests' and policyname = 'Requesters read own order requests' and cmd = 'SELECT'),
         'table grants: ' || coalesce((select string_agg(table_name || ':' || grantee || ':' || privilege_type, ', ') from grants), 'none')
           || '; column grants: ' || coalesce((select string_agg(distinct table_name || ':' || grantee || ':' || privilege_type, ', ') from colgrants), 'none')
           || '; policies: ' || coalesce((select string_agg(tablename || ' "' || policyname || '"', ', ') from pg_policies where schemaname = 'public' and tablename in (select name from t)), 'none')
  union all
  select 4, 'the customer line view is security-barrier, read-only for signed-in users, and has no partner or cost column',
         exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'order_request_lines_customer' and c.relkind = 'v' and c.reloptions @> array['security_barrier=true'])
           and (select coalesce(string_agg(privilege_type, ',' order by privilege_type), '') from information_schema.role_table_grants where table_schema = 'public' and table_name = 'order_request_lines_customer' and grantee = 'authenticated') = 'SELECT'
           and not exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name = 'order_request_lines_customer' and grantee = 'anon')
           and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'order_request_lines_customer' and column_name in ('source_org_id', 'cost_price_cents', 'vat_rate_bps')),
         'columns: ' || coalesce((select string_agg(column_name, ', ' order by ordinal_position) from information_schema.columns where table_schema = 'public' and table_name = 'order_request_lines_customer'), 'missing')
  union all
  select 5, 'order_request_payments: RLS on, no grants, append-only and guarded (payments, refunds, moves, exact reversals)',
         exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'order_request_payments' and c.relrowsecurity)
           and not exists (select 1 from grants where table_name = 'order_request_payments')
           and not exists (select 1 from colgrants where table_name = 'order_request_payments')
           and (select count(*) from pg_trigger g join pg_class c on c.oid = g.tgrelid where c.relname = 'order_request_payments' and not g.tgisinternal and g.tgenabled <> 'D') = 4,
         coalesce((select string_agg(g.tgname, ', ' order by g.tgname) from pg_trigger g join pg_class c on c.oid = g.tgrelid where c.relname = 'order_request_payments' and not g.tgisinternal), 'no triggers')
  union all
  select 6, 'supply_order_lines.supply_quote_line_id may be empty, and the "exactly one link" check exists (D11)',
         (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'supply_order_lines' and column_name = 'supply_quote_line_id') = 'YES'
           and exists (select 1 from pg_constraint where conname = 'supply_order_lines_one_source' and contype = 'c' and convalidated),
         'nullable=' || (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'supply_order_lines' and column_name = 'supply_quote_line_id')
           || '; check: ' || coalesce((select pg_get_constraintdef(oid) from pg_constraint where conname = 'supply_order_lines_one_source'), 'missing')
  union all
  select 7, 'supply_orders.quote_request_id may be empty, and the "exactly one source" check exists (option A)',
         (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'supply_orders' and column_name = 'quote_request_id') = 'YES'
           and exists (select 1 from pg_constraint where conname = 'supply_orders_one_source' and contype = 'c' and convalidated),
         'nullable=' || (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'supply_orders' and column_name = 'quote_request_id')
           || '; check: ' || coalesce((select pg_get_constraintdef(oid) from pg_constraint where conname = 'supply_orders_one_source'), 'missing')
  union all
  select 8, 'every existing supplier order still has its quote, and every existing order line its quote line (expected 0 orders on live)',
         not exists (select 1 from public.supply_orders where quote_request_id is null and order_request_id is null)
           and not exists (select 1 from public.supply_orders where order_request_id is not null)
           and not exists (select 1 from public.supply_order_lines where supply_quote_line_id is null),
         'orders: ' || (select count(*)::text from public.supply_orders) || ' (with a quote: ' || (select count(*)::text from public.supply_orders where quote_request_id is not null)
           || '); order lines: ' || (select count(*)::text from public.supply_order_lines) || ' (with a quote line: ' || (select count(*)::text from public.supply_order_lines where supply_quote_line_id is not null) || ')'
  union all
  select 9, 'the state machine, golden rule and money functions exist; only the server may run them',
         (select count(distinct p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in (select name from fn)) = 16
           and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in (select name from fn)
                             and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))),
         (select count(distinct p.proname)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in (select name from fn)) || ' of 16 functions'
  union all
  select 10, 'the guard, history, payment, append-only and supplier-order triggers are switched on',
         (select count(*) from pg_trigger g join pg_class c on c.oid = g.tgrelid join trg on trg.name = g.tgname and trg.tbl = c.relname where not g.tgisinternal and g.tgenabled <> 'D') = 10,
         (select count(*)::text from pg_trigger g join pg_class c on c.oid = g.tgrelid join trg on trg.name = g.tgname and trg.tbl = c.relname where not g.tgisinternal and g.tgenabled <> 'D') || ' of 10 triggers'
  union all
  select 11, 'the supply ledger''s rules are unchanged (a customer payment still needs a supplier order)',
         exists (select 1 from pg_constraint where conname = 'supply_ledger_order_needed' and pg_get_constraintdef(oid) like '%customer_payment%' and pg_get_constraintdef(oid) like '%order_id IS NOT NULL%')
           and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'supply_ledger_entries' and column_name = 'order_request_id'),
         coalesce((select pg_get_constraintdef(oid) from pg_constraint where conname = 'supply_ledger_order_needed'), 'missing')
  union all
  select 12, 'the new payment-details setting exists, is empty and is not public',
         (select value from setting where key = 'supply_payment_details') = '""'::jsonb
           and not exists (select 1 from public.site_settings_public where key = 'supply_payment_details'),
         coalesce((select value::text from setting where key = 'supply_payment_details'), 'missing')
  union all
  select 13, 'every switch unchanged: catalogue ordering, registration, homepage row, trade pricing Off; clean-ups on Dry run; the Jobs switches as before',
         (select value from setting where key = 'supply_catalogue_ordering') = 'false'::jsonb
           and (select value from setting where key = 'supply_partner_registration') = 'false'::jsonb
           and (select value from setting where key = 'home_business_row') = 'false'::jsonb
           and (select value from setting where key = 'supply_trade_pricing') = 'false'::jsonb
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
         coalesce((select string_agg(key || '=' || value::text, ', ' order by key) from setting where key in ('supply_catalogue_ordering', 'supply_partner_registration', 'home_business_row', 'supply_trade_pricing', 'jobs_data_cleanup_mode', 'imports_cleanup_mode', 'jobs_phone_apply', 'jobs_worker_register', 'jobs_recruitment_desk', 'jobs_private_client_posts', 'org_verification_expiry', 'jobs_amharic', 'jobs_callbacks', 'amharic_enabled', 'jobs_reports_enabled')), 'missing')
  union all
  select 14, 'the old site''s "jobs" table is untouched (no policy)',
         not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'jobs'),
         case when exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'jobs')
           then 'legacy table present: ' || (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.jobs', false, true, '')))[1]::text || ' rows, '
             || (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'jobs') || ' policies'
           else 'no legacy table here' end
  union all
  select 15, 'record counts of the new tables (information; expected 0 right after the migration)', true,
         (select string_agg(name || '=' || n, ', ' order by name) from counts)
) checks
order by sort;
