-- expect: 1|2|0030
select (select count(*) from pg_tables where schemaname = 'public' and tablename = 'build_projects'), (select count(*) from information_schema.columns where table_schema = 'public' and column_name = 'project_id' and table_name in ('service_requests', 'quote_requests')), (select version from public.schema_migrations where version = '0030');
