-- expect: false|0023
select (select value::text from public.site_settings where key = 'amharic_enabled'), (select version from public.schema_migrations where version = '0023');
