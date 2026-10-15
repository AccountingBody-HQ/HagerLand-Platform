-- expect: 2|1|0029
select (select count(*) from pg_tables where schemaname = 'public' and tablename in ('managed_property_documents', 'owner_messages')), (select count(*) from public.organisations where slug = 'hagerland-services' and is_hagerland), (select version from public.schema_migrations where version = '0029');
