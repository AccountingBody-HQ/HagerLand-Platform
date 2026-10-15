-- expect: 1|2|0032
select (select count(*) from pg_tables where schemaname = 'public' and tablename = 'reviews'), (select count(*) from pg_trigger where tgname in ('reviews_check_eligible', 'reviews_reply_once')), (select version from public.schema_migrations where version = '0032');
