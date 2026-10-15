-- expect: 1|0|0033
select (select count(*) from pg_tables where schemaname = 'public' and tablename = 'staff_users'), (select count(*) from public.staff_users), (select version from public.schema_migrations where version = '0033');
