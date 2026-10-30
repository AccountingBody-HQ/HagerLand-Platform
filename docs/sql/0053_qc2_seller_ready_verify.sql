-- Read-only check for migration 0053 (QC-2 seller-ready: payment methods, data-transfer consents, receipt numbers).
-- Run it in the Supabase SQL editor right after the migration. Every row should say PASS; the "detail" column shows the
-- evidence. It changes nothing.

with setting(key, value) as (select key, value from public.site_settings),
ledger_checks as (
  select conname, pg_get_constraintdef(oid) as def from pg_constraint where conrelid = 'public.supply_ledger_entries'::regclass and contype = 'c'
),
new_tables(name) as (values ('supply_payment_methods'), ('data_transfer_consents'), ('order_request_payment_receipts')),
tbl as (
  select n.name, c.oid, c.relrowsecurity from new_tables n
  left join pg_class c on c.relname = n.name and c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
),
cols as (
  select table_name, string_agg(column_name || ':' || data_type || ':' || is_nullable, ', ' order by ordinal_position) as list
  from information_schema.columns where table_schema = 'public' and table_name in (select name from new_tables) group by table_name
),
grants as (
  select table_name, grantee, privilege_type from information_schema.role_table_grants
  where table_schema = 'public' and table_name in (select name from new_tables) and grantee in ('anon', 'authenticated', 'PUBLIC')
)
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from (
  select 1 as sort, '0053 is recorded, and 0034–0052 are still recorded' as check_name,
         exists (select 1 from public.schema_migrations where version = '0053')
           and (select count(*) from public.schema_migrations where version between '0034' and '0052') = 19 as ok,
         (select string_agg(version, ', ' order by version) from public.schema_migrations where version >= '0034') as detail
  union all
  select 2, 'the payment methods table exists with its columns (name, instructions, active, sort order, dates, created by)',
         (select list from cols where table_name = 'supply_payment_methods') = 'id:uuid:NO, name:text:NO, instructions:text:NO, active:boolean:NO, sort_order:integer:NO, created_at:timestamp with time zone:NO, updated_at:timestamp with time zone:NO, created_by:text:YES',
         coalesce((select list from cols where table_name = 'supply_payment_methods'), 'missing')
  union all
  select 3, 'row level security is on for the three new tables',
         (select count(*) from tbl where oid is not null and relrowsecurity) = 3,
         (select string_agg(name || '=' || coalesce(case when relrowsecurity then 'RLS on' else 'RLS OFF' end, 'missing'), ', ' order by name) from tbl)
  union all
  select 4, 'visitors and signed-in users have no access to the three new tables (no grants)',
         not exists (select 1 from grants),
         coalesce((select string_agg(table_name || ':' || grantee || ':' || privilege_type, ', ') from grants), 'no grants')
  union all
  select 5, 'the consent record table exists and holds no personal data (no name, phone, email or internet-address column)',
         (select list from cols where table_name = 'data_transfer_consents') = 'id:uuid:NO, form:text:NO, subject_table:text:NO, subject_id:uuid:YES, subject_reference:text:YES, consent_version:text:NO, created_at:timestamp with time zone:NO'
           and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'data_transfer_consents'
                           and column_name ~ '(name|phone|email|ip|address)' and column_name not in ('subject_table')),
         coalesce((select list from cols where table_name = 'data_transfer_consents'), 'missing')
  union all
  select 6, 'payments have the new optional receipt number (1–64 characters), and later receipt numbers have their own append-only table',
         exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'order_request_payments' and column_name = 'receipt_number' and is_nullable = 'YES' and data_type = 'text')
           and exists (select 1 from pg_constraint where conname = 'order_request_payments_receipt_number_check' and convalidated)
           and exists (select 1 from pg_trigger where tgname = 'order_request_payment_receipts_append_only' and tgrelid = 'public.order_request_payment_receipts'::regclass)
           and exists (select 1 from pg_trigger where tgname = 'order_request_payments_append_only' and tgrelid = 'public.order_request_payments'::regclass),
         coalesce((select pg_get_constraintdef(oid) from pg_constraint where conname = 'order_request_payments_receipt_number_check'), 'constraint missing')
  union all
  select 7, 'no payment has a receipt number yet, and no later receipt number exists (information: number of payments)',
         not exists (select 1 from public.order_request_payments where receipt_number is not null)
           and not exists (select 1 from public.order_request_payment_receipts),
         'payments=' || (select count(*)::text from public.order_request_payments) || ', with receipt=' || (select count(*)::text from public.order_request_payments where receipt_number is not null)
  union all
  select 8, 'no payment method was added by the migration (0 rows)',
         not exists (select 1 from public.supply_payment_methods),
         'payment methods=' || (select count(*)::text from public.supply_payment_methods)
  union all
  select 9, 'catalogue ordering and trade price agreements are still Off',
         (select value from setting where key = 'supply_catalogue_ordering') = 'false'::jsonb
           and (select value from setting where key = 'supply_trade_pricing') = 'false'::jsonb,
         coalesce((select string_agg(key || '=' || value::text, ', ' order by key) from setting where key in ('supply_catalogue_ordering', 'supply_trade_pricing')), 'missing')
  union all
  select 10, 'the supply ledger''s 16 checks are exactly as before (fingerprint)',
         (select md5(string_agg(conname || '=' || def, E'\n' order by conname)) from ledger_checks) = '6fc7e5654337f30b914fbeb1489856e8'
           and (select count(*) from ledger_checks) = 16,
         'md5=' || coalesce((select md5(string_agg(conname || '=' || def, E'\n' order by conname)) from ledger_checks), 'none') || '; checks=' || (select count(*)::text from ledger_checks)
  union all
  select 11, 'the old site''s "jobs" table is untouched (no policy)',
         not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'jobs'),
         case when exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'jobs')
           then 'legacy table present: ' || (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'jobs') || ' policies'
           else 'no legacy table here' end
) checks
order by sort;
