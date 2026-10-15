-- expect: 4|1|0020
select (select count(*) from public.product_categories where slug in ('construction-equipment', 'interior-finishing', 'landscaping', 'specialist-products')), (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'trade_accounts'), (select version from public.schema_migrations where version = '0020');
