-- expect: 0|0024
select (select count(*) from public.email_outbox), (select version from public.schema_migrations where version = '0024');
