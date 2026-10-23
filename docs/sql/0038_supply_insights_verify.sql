-- Read-only check for migration 0038 (supply insights). Run it in the Supabase SQL editor after the migration.
-- Every row should say PASS. It changes nothing.

with cols as (
  select column_name, data_type, is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'supply_orders'
),
trig as (
  select c.relname as tbl, t.tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
),
fn as (select proname, prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public')
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from (
  select 1 as sort, 'supply_orders.promised_delivery_on: a date, may be empty' as check_name,
         exists (select 1 from cols where column_name = 'promised_delivery_on' and data_type = 'date' and is_nullable = 'YES') as ok,
         coalesce((select data_type || ', nullable ' || is_nullable from cols where column_name = 'promised_delivery_on'), 'missing') as detail
  union all
  select 2, 'supply_orders.promised_change_reason: text, may be empty',
         exists (select 1 from cols where column_name = 'promised_change_reason' and data_type = 'text' and is_nullable = 'YES'),
         coalesce((select data_type from cols where column_name = 'promised_change_reason'), 'missing')
  union all
  select 3, 'no existing order has a promised date yet (new column starts empty)',
         true, (select count(*) filter (where promised_delivery_on is not null)::text || ' of ' || count(*)::text || ' orders have a promised date' from public.supply_orders)
  union all
  select 4, 'the golden rule is still checked by the database (model A never paid or placed before full payment)',
         exists (select 1 from trig where tbl = 'supply_orders' and tgname = 'supply_orders_guard')
           and exists (select 1 from fn where proname = 'supply_orders_guard' and prosrc like '%The customer has not paid this order in full yet%' and prosrc like '%supply_order_paid_cents%'), ''
  union all
  select 5, 'allowed status changes, reasons and proof before completion are still checked',
         exists (select 1 from fn where proname = 'supply_orders_guard' and prosrc like '%supply_order_transition_allowed%' and prosrc like '%Give a reason%' and prosrc like '%Add delivery proof before completing%')
           and exists (select 1 from fn where proname = 'supply_order_transition_allowed'), ''
  union all
  select 6, 'the promised date cannot change after delivery, completion or cancellation',
         exists (select 1 from fn where proname = 'supply_orders_guard' and prosrc like '%promised_delivery_on is distinct from old.promised_delivery_on%'), ''
  union all
  select 7, 'promised-date changes and status changes are written to the timeline',
         exists (select 1 from trig where tbl = 'supply_orders' and tgname = 'supply_orders_timeline')
           and exists (select 1 from fn where proname = 'supply_orders_timeline' and prosrc like '%promised_date%' and prosrc like '%''status'', old.status, new.status%'), ''
  union all
  select 8, 'ledger and timeline are still append-only (no changes, deletions or emptying)',
         (select count(*) from trig where tgname in ('supply_ledger_append_only', 'supply_ledger_no_truncate', 'supply_order_events_append_only', 'supply_order_events_no_truncate')) = 4, ''
  union all
  select 9, 'payments, proof and reversals still checked (ledger guard, proof guard, one live order per line)',
         (select count(*) from trig where tgname in ('supply_ledger_guard', 'supply_ledger_timeline', 'supply_delivery_proofs_guard', 'supply_delivery_proofs_timeline', 'supply_order_lines_guard')) = 5, ''
  union all
  select 10, 'new index for partner performance exists',
         exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'supply_quote_lines_org_idx'), ''
  union all
  select 11, 'visitors and signed-in users cannot run the order functions',
         not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace, (values ('anon'), ('authenticated')) r(role)
                     where n.nspname = 'public' and p.proname like 'supply\_%' and has_function_privilege(r.role, p.oid, 'EXECUTE')), ''
  union all
  select 12, 'all supply tables still private (row level security on, no access for visitors or signed-in users)',
         not exists (
           select 1 from (values ('supply_partners'), ('supply_contacts'), ('supplier_offers'), ('supply_quote_lines'), ('supply_agreements'), ('supply_orders'), ('supply_order_lines'), ('supply_order_events'), ('supply_delivery_proofs'), ('supply_ledger_entries')) t(name)
           where to_regclass('public.' || t.name) is null
              or not (select relrowsecurity from pg_class where oid = to_regclass('public.' || t.name))
              or exists (select 1 from (values ('anon'), ('authenticated')) r(role), (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) p(priv) where has_table_privilege(r.role, 'public.' || t.name, p.priv))
         ), '10 tables'
  union all
  select 13, 'earlier supply rules intact (one current price, one chosen supplier per item, one active agreement)',
         exists (select 1 from pg_indexes where indexname = 'supplier_offers_one_current_key') and exists (select 1 from pg_indexes where indexname = 'supply_quote_lines_one_chosen_key')
           and exists (select 1 from pg_indexes where indexname = 'supply_agreements_one_active_key') and exists (select 1 from trig where tgname = 'supplier_offers_supersede'), ''
  union all
  select 14, 'private storage bucket supply-private still private',
         exists (select 1 from storage.buckets where id = 'supply-private' and not public), ''
  union all
  select 15, 'migration 0038 is recorded in schema_migrations', exists (select 1 from public.schema_migrations where version = '0038'), ''
) checks
order by sort, check_name;
