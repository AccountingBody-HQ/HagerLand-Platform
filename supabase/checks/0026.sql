-- expect: 5|0026
select (select count(*) from pg_indexes where schemaname = 'public' and indexname in ('deals_org_idx', 'service_requests_category_idx', 'claims_user_idx', 'media_uploader_idx', 'development_updates_created_by_idx')), (select version from public.schema_migrations where version = '0026');
