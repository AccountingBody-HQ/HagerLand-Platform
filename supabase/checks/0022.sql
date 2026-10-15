-- expect: 2|1|0022
select (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('org_invitations', 'org_branches')), (select count(*) from pg_trigger where tgname = 'protect_last_owner'), (select version from public.schema_migrations where version = '0022');
