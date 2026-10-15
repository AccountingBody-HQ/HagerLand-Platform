-- expect: t|0025
select has_column_privilege('authenticated', 'public.quote_requests', 'quote_document_path', 'select'), (select version from public.schema_migrations where version = '0025');
