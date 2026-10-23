-- Read-only check for migration 0034 (supply partners). Run it in the Supabase SQL editor after the migration.
-- Every row should say PASS. It changes nothing.

with t(name) as (values ('supply_partners'), ('supply_contacts')),
privs(p) as (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'))
select check_name, case when ok then 'PASS' else 'FAIL' end as result
from (
  select 'table public.' || t.name || ' exists' as check_name, to_regclass('public.' || t.name) is not null as ok, 1 as sort, t.name as tname
  from t
  union all
  select 'row level security is on for ' || t.name,
         coalesce((select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.' || t.name)), false), 2, t.name
  from t
  union all
  select r.role || ' has no access to ' || t.name,
         to_regclass('public.' || t.name) is not null
           and not exists (select 1 from privs where has_table_privilege(r.role, 'public.' || t.name, privs.p))
           and not exists (select 1 from information_schema.role_table_grants g
                           where g.table_schema = 'public' and g.table_name = t.name and g.grantee in (r.role, 'PUBLIC')),
         3, t.name
  from t cross join (values ('anon'), ('authenticated')) as r(role)
  union all
  select 'no access policies on ' || t.name,
         not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.name), 4, t.name
  from t
  union all
  select 'migration 0034 is recorded in schema_migrations',
         exists (select 1 from public.schema_migrations where version = '0034'), 5, 'zz'
) checks
order by sort, tname, check_name;
