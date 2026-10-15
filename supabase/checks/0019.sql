-- expect: 4|2|0019
select (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('job_posts', 'job_applications', 'candidate_profiles', 'development_updates')), (select count(*) from public.service_categories where slug in ('recruitment', 'staffing')), (select version from public.schema_migrations where version = '0019');
