-- Read-only check for migration 0035 (supplier offers). Run it in the Supabase SQL editor after the migration.
-- Every row should say PASS. It changes nothing.

select check_name, case when ok then 'PASS' else 'FAIL' end as result
from (
  select 1 as sort, 'table public.supplier_offers exists' as check_name, to_regclass('public.supplier_offers') is not null as ok
  union all
  select 2, 'row level security is on for supplier_offers',
         coalesce((select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.supplier_offers')), false)
  union all
  select 3, r.role || ' has no access to supplier_offers',
         to_regclass('public.supplier_offers') is not null
           and not exists (select 1 from (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as p(priv)
                           where has_table_privilege(r.role, 'public.supplier_offers', p.priv))
           and not exists (select 1 from information_schema.role_table_grants g
                           where g.table_schema = 'public' and g.table_name = 'supplier_offers' and g.grantee in (r.role, 'PUBLIC'))
  from (values ('anon'), ('authenticated')) as r(role)
  union all
  select 4, 'no access policies on supplier_offers',
         not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'supplier_offers')
  union all
  select 5, 'one-current-offer unique index exists',
         exists (select 1 from pg_indexes i where i.schemaname = 'public' and i.indexname = 'supplier_offers_one_current_key' and i.indexdef ilike '%unique%' and i.indexdef ilike '%where%current%')
  union all
  select 6, 'supersede trigger exists',
         exists (select 1 from pg_trigger t where t.tgrelid = to_regclass('public.supplier_offers') and t.tgname = 'supplier_offers_supersede' and not t.tgisinternal)
  union all
  select 7, 'migration 0035 is recorded in schema_migrations',
         exists (select 1 from public.schema_migrations where version = '0035')
) checks
order by sort, check_name;
