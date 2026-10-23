-- Read-only check for migration 0036 (suppliers for each quote). Run it in the Supabase SQL editor after the migration.
-- Every row should say PASS. It changes nothing. Run it straight after the migration (before adding items in admin).

with cols as (
  select column_name, data_type, is_nullable, column_default
  from information_schema.columns
  where table_schema = 'public' and table_name = 'quote_request_items'
),
lines as (select to_regclass('public.supply_quote_lines') as oid),
con as (
  select conname, pg_get_constraintdef(c.oid) as def
  from pg_constraint c where c.conrelid = (select oid from lines)
),
idx as (select indexname, indexdef from pg_indexes where schemaname = 'public' and tablename = 'supply_quote_lines'),
pol as (
  select pg_get_expr(polqual, polrelid) as qual from pg_policy
  where polrelid = 'public.quote_request_items'::regclass and polname = 'Requesters read own quote items'
)
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from (
  select 1 as sort, 'quote_request_items.added_by_admin: boolean, not null, default false' as check_name,
         exists (select 1 from cols where column_name = 'added_by_admin' and data_type = 'boolean' and is_nullable = 'NO' and column_default = 'false') as ok,
         coalesce((select data_type || ', nullable ' || is_nullable || ', default ' || coalesce(column_default, 'none') from cols where column_name = 'added_by_admin'), 'missing') as detail
  union all
  select 2, 'quote_request_items.category_id: uuid, nullable, links to product_categories',
         exists (select 1 from cols where column_name = 'category_id' and data_type = 'uuid' and is_nullable = 'YES')
           and exists (select 1 from pg_constraint where conrelid = 'public.quote_request_items'::regclass and contype = 'f' and pg_get_constraintdef(oid) like '%(category_id) REFERENCES product_categories(id) ON DELETE SET NULL%'),
         coalesce((select data_type || ', nullable ' || is_nullable from cols where column_name = 'category_id'), 'missing')
  union all
  select 3, 'quote_request_items.removed_at: timestamptz, nullable',
         exists (select 1 from cols where column_name = 'removed_at' and data_type = 'timestamp with time zone' and is_nullable = 'YES'),
         coalesce((select data_type from cols where column_name = 'removed_at'), 'missing')
  union all
  select 4, 'quote_request_items.removed_by: text, nullable',
         exists (select 1 from cols where column_name = 'removed_by' and data_type = 'text' and is_nullable = 'YES'),
         coalesce((select data_type from cols where column_name = 'removed_by'), 'missing')
  union all
  select 5, 'no existing item is marked as added by HagerLand',
         not exists (select 1 from public.quote_request_items where added_by_admin),
         (select count(*)::text || ' items in total, ' || count(*) filter (where added_by_admin)::text || ' added by HagerLand' from public.quote_request_items)
  union all
  select 6, 'customer read rule hides items added by HagerLand',
         exists (select 1 from pol where qual like '%NOT added_by_admin%' and qual like '%requester_user_id = auth.uid()%'),
         coalesce((select left(qual, 200) from pol), 'policy missing')
  union all
  select 7, 'customers cannot add, change or remove items',
         not has_table_privilege('authenticated', 'public.quote_request_items', 'INSERT')
           and not has_table_privilege('authenticated', 'public.quote_request_items', 'UPDATE')
           and not has_table_privilege('authenticated', 'public.quote_request_items', 'DELETE')
           and not has_table_privilege('anon', 'public.quote_request_items', 'SELECT'),
         'insert/update/delete for signed-in users, read for visitors'
  union all
  select 8, 'table public.supply_quote_lines exists', (select oid from lines) is not null, coalesce((select oid::text from lines), 'missing')
  union all
  select 9, 'row level security is on for supply_quote_lines',
         coalesce((select relrowsecurity from pg_class where oid = (select oid from lines)), false), ''
  union all
  select 10, r.role || ' has no access to supply_quote_lines',
         (select oid from lines) is not null
           and not exists (select 1 from (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as p(priv) where has_table_privilege(r.role, 'public.supply_quote_lines', p.priv))
           and not exists (select 1 from information_schema.role_table_grants g where g.table_schema = 'public' and g.table_name = 'supply_quote_lines' and g.grantee in (r.role, 'PUBLIC')),
         ''
  from (values ('anon'), ('authenticated')) as r(role)
  union all
  select 11, 'no access policies on supply_quote_lines',
         not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'supply_quote_lines'), ''
  union all
  select 12, 'status check allows shortlisted, asked, received, chosen, rejected',
         exists (select 1 from con where def like '%status = ANY%shortlisted%asked%received%chosen%rejected%'), ''
  union all
  select 13, 'a reply (received or chosen) needs a price and a quantity',
         exists (select 1 from con where conname = 'supply_quote_lines_reply_complete'), coalesce((select def from con where conname = 'supply_quote_lines_reply_complete'), 'missing')
  union all
  select 14, 'unique: one line per item and partner',
         exists (select 1 from idx where indexname = 'supply_quote_lines_item_org_key' and indexdef ilike 'create unique%(quote_item_id, org_id)%where (quote_item_id is not null)%'), ''
  union all
  select 15, 'unique: one whole-quote line per partner',
         exists (select 1 from idx where indexname = 'supply_quote_lines_quote_org_key' and indexdef ilike 'create unique%(quote_request_id, org_id)%where (quote_item_id is null)%'), ''
  union all
  select 16, 'unique: at most one chosen line per item',
         exists (select 1 from idx where indexname = 'supply_quote_lines_one_chosen_key' and indexdef ilike 'create unique%(quote_item_id)%chosen%'), ''
  union all
  select 17, 'links: quote, item, organisation, branch and price',
         (select count(*) from con where def like 'FOREIGN KEY%') = 5
           and exists (select 1 from con where def like 'FOREIGN KEY (quote_request_id) REFERENCES quote_requests(id)%')
           and exists (select 1 from con where def like 'FOREIGN KEY (quote_item_id) REFERENCES quote_request_items(id)%')
           and exists (select 1 from con where def like 'FOREIGN KEY (org_id) REFERENCES organisations(id)%')
           and exists (select 1 from con where def like 'FOREIGN KEY (branch_id) REFERENCES org_branches(id)%')
           and exists (select 1 from con where def like 'FOREIGN KEY (offer_id) REFERENCES supplier_offers(id) ON DELETE SET NULL%'),
         (select count(*)::text || ' foreign keys' from con where def like 'FOREIGN KEY%')
  union all
  select 18, 'supplier price sources unchanged (no new value needed)',
         exists (select 1 from pg_constraint where conrelid = 'public.supplier_offers'::regclass and pg_get_constraintdef(oid) like '%direct_call%site_visit%partner_submitted%price_list_photo%business_website%other%'), ''
  union all
  select 19, 'migration 0036 is recorded in schema_migrations',
         exists (select 1 from public.schema_migrations where version = '0036'), ''
) checks
order by sort, check_name;
