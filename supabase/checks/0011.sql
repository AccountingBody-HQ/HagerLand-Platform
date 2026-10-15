-- expect: 10|6|t|2
select (select count(*) from public.verticals), (select count(*) from public.verticals where status = 'live'), (select count(*) from public.schema_migrations where version between '0001' and '0011') = 11, (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('interest_registrations', 'partner_applications'));
