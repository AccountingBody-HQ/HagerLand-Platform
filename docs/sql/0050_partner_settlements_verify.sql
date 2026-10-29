-- Read-only check for migration 0050 (S6-3 partner terms → prices, settlements after delivery, reconciliation). Run it in
-- the Supabase SQL editor right after the migration. Every row should say PASS; the "detail" column shows the evidence.
-- It changes nothing. The last row only shows the record counts of the new tables (information: expected all 0).

with t(name) as (values ('partner_settlements'), ('partner_settlement_items')),
setting(key, value) as (select key, value from public.site_settings),
grants as (
  select table_name, grantee, privilege_type from information_schema.role_table_grants
  where table_schema = 'public' and table_name in (select name from t) and grantee in ('anon', 'authenticated')
),
ledger_checks as (
  select conname, pg_get_constraintdef(oid) as def from pg_constraint where conrelid = 'public.supply_ledger_entries'::regclass and contype = 'c'
),
fn(name) as (
  values ('supply_round_div'), ('supply_suggested_terms'), ('supply_resolve_terms'), ('supply_order_payable_cents'), ('supply_order_upfront'),
         ('partner_settlement_items_guard'), ('partner_settlement_items_total'), ('partner_settlements_guard'), ('partner_settlements_after'),
         ('partner_settlement_create'), ('partner_settlement_pay'), ('supply_ledger_refund_after_settlement'), ('partner_draft_approve')
),
trg(name, tbl) as (
  values ('partner_settlement_items_guard', 'partner_settlement_items'), ('partner_settlements_guard', 'partner_settlements'),
         ('partner_settlements_after', 'partner_settlements'), ('supply_ledger_refund_after_settlement', 'supply_ledger_entries')
),
newcols(tbl, col) as (
  values ('order_request_lines', 'terms_model'), ('order_request_lines', 'terms_bps'), ('order_request_lines', 'partner_payable_unit_cents'),
         ('supply_orders', 'hagerland_delivery_income_cents')
),
counts as (
  select 'partner_settlements' as name, count(*) as n from public.partner_settlements
  union all select 'partner_settlement_items', count(*) from public.partner_settlement_items
)
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from (
  select 1 as sort, '0050 is recorded, and 0034–0049 are still recorded' as check_name,
         exists (select 1 from public.schema_migrations where version = '0050')
           and (select count(*) from public.schema_migrations where version between '0034' and '0049') = 16 as ok,
         (select string_agg(version, ', ' order by version) from public.schema_migrations where version >= '0034') as detail
  union all
  select 2, 'the two new tables exist with row level security on, no grants to visitors or signed-in users, and no policies',
         (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in (select name from t) and c.relkind = 'r' and c.relrowsecurity) = 2
           and not exists (select 1 from grants)
           and not exists (select 1 from pg_policies where schemaname = 'public' and tablename in (select name from t)),
         coalesce((select string_agg(c.relname || '=' || case when c.relrowsecurity then 'RLS on' else 'RLS OFF' end, ', ' order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in (select name from t)), 'missing')
           || '; grants: ' || coalesce((select string_agg(table_name || ':' || grantee || ':' || privilege_type, ', ') from grants), 'none')
           || '; policies: ' || (select count(*)::text from pg_policies where schemaname = 'public' and tablename in (select name from t))
  union all
  select 3, 'the settlement rules exist: item guard (after delivery with proof, or up front with a reason), status guard (draft → approved → paid | void; final), one payable per order, refund adjustment',
         (select count(*) from pg_trigger g join pg_class c on c.oid = g.tgrelid join trg on trg.name = g.tgname and trg.tbl = c.relname where not g.tgisinternal and g.tgenabled <> 'D') = 4
           and exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'partner_settlement_items_one_payable_key' and indexdef like '%UNIQUE%' and indexdef like '%kind = ''payable''%' and indexdef like '%NOT settlement_void%')
           and exists (select 1 from pg_constraint where conname = 'partner_settlement_items_payable')
           and exists (select 1 from pg_constraint where conname = 'partner_settlement_items_adjustment')
           and exists (select 1 from pg_constraint where conname = 'partner_settlements_paid_complete')
           and exists (select 1 from pg_constraint where conname = 'partner_settlements_void_reason'),
         (select string_agg(g.tgname || ' on ' || c.relname, ', ' order by g.tgname) from pg_trigger g join pg_class c on c.oid = g.tgrelid where g.tgname in (select name from trg))
           || '; unique: ' || coalesce((select indexdef from pg_indexes where indexname = 'partner_settlement_items_one_payable_key'), 'missing')
  union all
  select 4, 'the new functions exist; only the server may run them',
         (select count(distinct p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in (select name from fn)) = 13
           and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in (select name from fn)
                             and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))),
         (select count(distinct p.proname)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in (select name from fn)) || ' of 13 functions'
  union all
  select 5, 'the four new columns are empty, nullable and have no default (order_request_lines terms snapshot; supply_orders delivery income)',
         (select count(*) from information_schema.columns c join newcols n on n.tbl = c.table_name and n.col = c.column_name where c.table_schema = 'public' and c.is_nullable = 'YES' and c.column_default is null) = 4
           and not exists (select 1 from public.order_request_lines where terms_model is not null or terms_bps is not null or partner_payable_unit_cents is not null)
           and not exists (select 1 from public.supply_orders where hagerland_delivery_income_cents is not null),
         (select string_agg(c.table_name || '.' || c.column_name || ' nullable=' || c.is_nullable || ' default=' || coalesce(c.column_default, 'none'), '; ') from information_schema.columns c join newcols n on n.tbl = c.table_name and n.col = c.column_name where c.table_schema = 'public')
  union all
  select 6, 'one model per partner source (markup or commission, never both), and no loss on an order request line',
         exists (select 1 from pg_constraint where conname = 'product_sources_one_model' and convalidated)
           and exists (select 1 from pg_constraint where conname = 'order_request_lines_no_loss' and convalidated),
         coalesce((select pg_get_constraintdef(oid) from pg_constraint where conname = 'product_sources_one_model'), 'missing') || '; '
           || coalesce((select pg_get_constraintdef(oid) from pg_constraint where conname = 'order_request_lines_no_loss'), 'missing')
  union all
  select 7, 'the supply ledger''s 16 checks are exactly as before (fingerprint), and it has no new column',
         (select md5(string_agg(conname || '=' || def, E'\n' order by conname)) from ledger_checks) = '6fc7e5654337f30b914fbeb1489856e8'
           and (select count(*) from ledger_checks) = 16
           and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'supply_ledger_entries' and column_name in ('settlement_id', 'order_request_id')),
         (select string_agg(conname || ' = ' || def, ' | ' order by conname) from ledger_checks)
  union all
  select 8, 'every switch unchanged: catalogue ordering, registration, homepage row, trade pricing Off; clean-ups on Dry run; the Jobs switches as before; payment details empty',
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
  select 9, 'the old site''s "jobs" table is untouched (no policy)',
         not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'jobs'),
         case when exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'jobs')
           then 'legacy table present: ' || (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.jobs', false, true, '')))[1]::text || ' rows, '
             || (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'jobs') || ' policies'
           else 'no legacy table here' end
  union all
  select 10, 'record counts of the new tables (information; expected 0 right after the migration)', true,
         (select string_agg(name || '=' || n, ', ' order by name) from counts)
) checks
order by sort;
