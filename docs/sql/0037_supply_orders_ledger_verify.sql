-- Read-only check for migration 0037 (agreements, orders, delivery proof, ledger). Run it in the Supabase SQL editor
-- after the migration. Every row should say PASS. It changes nothing.

with new_tables(name) as (values ('supply_agreements'), ('supply_orders'), ('supply_order_lines'), ('supply_order_events'), ('supply_delivery_proofs'), ('supply_ledger_entries')),
revoked(name) as (values ('brands'), ('claims'), ('developments'), ('enquiries'), ('locations'), ('media'), ('org_product_categories'), ('organisation_members'), ('organisation_services'), ('organisations'), ('portfolio_projects'), ('product_categories'), ('products'), ('profiles'), ('properties'), ('quote_request_items'), ('quote_requests'), ('service_categories'), ('verification_requests')),
cons as (
  select c.conrelid::regclass::text as tbl, c.conname, pg_get_constraintdef(c.oid) as def
  from pg_constraint c join pg_namespace n on n.oid = c.connamespace
  where n.nspname = 'public' and c.conrelid::regclass::text in (select 'supply_' || x from (values ('agreements'), ('orders'), ('order_lines'), ('delivery_proofs'), ('ledger_entries')) v(x))
),
trig as (
  select c.relname as tbl, t.tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
)
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from (
  select 1 as sort, 'table public.' || t.name || ' exists' as check_name, to_regclass('public.' || t.name) is not null as ok, '' as detail from new_tables t
  union all
  select 2, 'row level security is on for ' || t.name, coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.' || t.name)), false), '' from new_tables t
  union all
  select 3, 'visitors and signed-in users have no access to ' || t.name,
         to_regclass('public.' || t.name) is not null
           and not exists (select 1 from (values ('anon'), ('authenticated')) r(role), (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) p(priv) where has_table_privilege(r.role, 'public.' || t.name, p.priv))
           and not exists (select 1 from information_schema.role_table_grants g where g.table_schema = 'public' and g.table_name = t.name and g.grantee in ('anon', 'authenticated', 'PUBLIC')),
         '' from new_tables t
  union all
  select 4, 'no access policies on ' || t.name, not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t.name), '' from new_tables t
  union all
  select 5, 'agreements: money model A, B or both; commission needed for B or both; end after start; reason when terminated',
         (select count(*) from cons where tbl = 'supply_agreements' and (def like '%money_model = ANY%''A''%''B''%''both''%' or conname in ('supply_agreements_commission_needed', 'supply_agreements_dates', 'supply_agreements_terminated_reason'))) = 4, ''
  union all
  select 6, 'agreements: only one active agreement per partner',
         exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'supply_agreements_one_active_key' and indexdef ilike 'create unique%(org_id)%where (status = ''active''%'), ''
  union all
  select 7, 'orders: the ten statuses, and model B never waits for payment',
         exists (select 1 from cons where tbl = 'supply_orders' and def like '%draft%awaiting_payment%paid%placed%confirmed%out_for_delivery%delivered%completed%cancelled%disputed%')
           and exists (select 1 from cons where conname = 'supply_orders_model_b_no_payment_steps'), ''
  union all
  select 8, 'orders: references are unique and come from the HLO counter',
         exists (select 1 from cons where tbl = 'supply_orders' and def like 'UNIQUE (reference)%')
           and coalesce((select column_default from information_schema.columns where table_schema = 'public' and table_name = 'supply_orders' and column_name = 'reference'), '') like '%next_reference(''HLO''%',
         coalesce((select column_default from information_schema.columns where table_schema = 'public' and table_name = 'supply_orders' and column_name = 'reference'), 'missing')
  union all
  select 9, 'ledger: entry types, directions, reasons for adjustments and reversals, and foreign-currency details together',
         (select count(*) from cons where conname in ('supply_ledger_direction_matches', 'supply_ledger_reason_needed', 'supply_ledger_reversal_link', 'supply_ledger_fx_together', 'supply_ledger_order_needed')) = 5, ''
  union all
  select 10, 'ledger: an entry can be reversed only once', exists (select 1 from cons where tbl = 'supply_ledger_entries' and def like 'UNIQUE (reverses_entry_id)%'), ''
  union all
  select 11, 'delivery proof: a reason is needed to remove it', exists (select 1 from cons where conname = 'supply_delivery_proofs_removed_reason'), ''
  union all
  select 12, 'golden rule and allowed status changes are checked by the database (orders trigger)',
         exists (select 1 from trig where tbl = 'supply_orders' and tgname = 'supply_orders_guard')
           and exists (select 1 from pg_proc where proname = 'supply_order_transition_allowed')
           and exists (select 1 from pg_proc where proname = 'supply_order_paid_cents' and prosrc like '%customer_payment%refund%'), ''
  union all
  select 13, 'order timeline is written by the database',
         exists (select 1 from trig where tbl = 'supply_orders' and tgname = 'supply_orders_timeline')
           and exists (select 1 from trig where tbl = 'supply_ledger_entries' and tgname = 'supply_ledger_timeline')
           and exists (select 1 from trig where tbl = 'supply_delivery_proofs' and tgname = 'supply_delivery_proofs_timeline'), ''
  union all
  select 14, 'ledger and timeline cannot be changed, deleted or emptied',
         (select count(*) from trig where tgname in ('supply_ledger_append_only', 'supply_ledger_no_truncate', 'supply_order_events_append_only', 'supply_order_events_no_truncate')) = 4, ''
  union all
  select 15, 'a supplier line can be in only one live order; lines and proof are never deleted',
         exists (select 1 from trig where tbl = 'supply_order_lines' and tgname = 'supply_order_lines_guard')
           and exists (select 1 from trig where tbl = 'supply_delivery_proofs' and tgname = 'supply_delivery_proofs_guard'), ''
  union all
  select 16, 'reversals must mirror the entry they correct', exists (select 1 from trig where tbl = 'supply_ledger_entries' and tgname = 'supply_ledger_guard'), ''
  union all
  select 17, 'visitors and signed-in users cannot run the order functions',
         not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace, (values ('anon'), ('authenticated')) r(role)
                     where n.nspname = 'public' and p.proname like 'supply\_%' and has_function_privilege(r.role, p.oid, 'EXECUTE')), ''
  union all
  select 18, 'storage bucket supply-private exists and is private (10 MB, photos and PDF)',
         exists (select 1 from storage.buckets where id = 'supply-private' and not public and file_size_limit = 10485760 and 'application/pdf' = any (allowed_mime_types) and 'image/heic' = any (allowed_mime_types)),
         coalesce((select 'public ' || public::text || ', limit ' || coalesce(file_size_limit::text, 'none') from storage.buckets where id = 'supply-private'), 'missing')
  union all
  select 19, 'no storage access rules mention supply-private (server only)',
         not exists (select 1 from pg_policies where schemaname = 'storage' and (coalesce(qual, '') like '%supply-private%' or coalesce(with_check, '') like '%supply-private%')), ''
  union all
  select 20, 'unused privileges removed from ' || r.name,
         not has_table_privilege('authenticated', 'public.' || r.name, 'TRUNCATE') and not has_table_privilege('authenticated', 'public.' || r.name, 'REFERENCES') and not has_table_privilege('authenticated', 'public.' || r.name, 'TRIGGER')
           and not has_table_privilege('anon', 'public.' || r.name, 'TRUNCATE') and not has_table_privilege('anon', 'public.' || r.name, 'REFERENCES') and not has_table_privilege('anon', 'public.' || r.name, 'TRIGGER'),
         '' from revoked r
  union all
  select 21, 'earlier supply tables still intact (partners, contacts, prices, quote lines)',
         to_regclass('public.supply_partners') is not null and to_regclass('public.supply_contacts') is not null and to_regclass('public.supplier_offers') is not null and to_regclass('public.supply_quote_lines') is not null
           and exists (select 1 from pg_indexes where indexname = 'supplier_offers_one_current_key') and exists (select 1 from pg_indexes where indexname = 'supply_quote_lines_one_chosen_key')
           and exists (select 1 from trig where tgname = 'supplier_offers_supersede'), ''
  union all
  select 22, 'migration 0037 is recorded in schema_migrations', exists (select 1 from public.schema_migrations where version = '0037'), ''
) checks
order by sort, check_name;
